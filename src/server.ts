/**
 * Jigasi SIP Connector Service.
 */

import { Connection, Event } from 'modesl';
import { ConnectionEvent } from 'modesl/dist/esl/Connection';

import { AudioMessage } from './audioMessage';
import { CallState, loopAudioMessage, playAudioMessage, sendJigasiInfoRequest, sendJigasiMuteRequest, setAvModeration, setCallState, setHandRaised, setMuted, setNickname } from './call';
import { ChannelEvent, EventFilter, ChannelEventName, CustomChannelVariables } from './event'
import freeswitch from './freeswitch';
import { JigasiMessageHeader, JigasiMessageType } from './jigasiMessage';
import Log from './log';
import restAPI from './restAPI';
import stats from './stats';

const CONNECTION_RETRY_TIMEOUT = 10000;
const jigasiSipUri = process.env.JIGASI_SIP_URI;
const ivrNumber = process.env.FREESWITCH_IVR_DESTINATION;
restAPI;
const STATS_POLLING_INTERVAL = 60000;

enum BackgroundJob {
    ShowCallsCount = 'show calls count as json',
    ShowRegistrations = 'show registrations as json',
    SofiaStatus = 'sofia status',
}

const init = () => {
    freeswitch.connect()
        .then((connection: Connection) => {
            connection.subscribe(EventFilter.AllSubscription);

            connection.on(ConnectionEvent.End, handleConnectionClose);
            connection.on(ConnectionEvent.Error, handleConnectionFailure);

            connection.on(EventFilter.BackgroundJob, handleBackgroundJob);
            connection.on(EventFilter.ChannelBridge, handleChannelBridge);
            connection.on(EventFilter.ChannelExecuteComplete, handleChannelExecuteComplete);
            connection.on(EventFilter.ChannelHangup, handleChannelHangup);
            connection.on(EventFilter.InboundCall, handleInboundCall);
            connection.on(EventFilter.HandRaiseToggle, handleHandRaiseToggle);
            connection.on(EventFilter.MuteToggle, handleMuteToggle);
            connection.on(EventFilter.RecvInfo, handleRecvInfo);
            connection.on(EventFilter.SessionHeartbeat, handleSessionHeartbeat);

            // In debug mode log any event.
            Log.isDebugEnabled() && connection.on(EventFilter.Any, (event: Event) => {
                Log.debug(`${event.getHeader('Event-Name')} event: body ${event.getBody()}`);
            });

            setInterval(pollStats, STATS_POLLING_INTERVAL);
        })
        .catch(handleConnectionFailure);
};

const handleConnectionClose = () => {
    Log.error(`Connection to Freeswitch was closed. Retrying in ${CONNECTION_RETRY_TIMEOUT} milliseconds...`);
    setTimeout(init, CONNECTION_RETRY_TIMEOUT);
}

const handleConnectionFailure = () => {
    Log.error(`Error connecting to Freeswitch. Retrying in ${CONNECTION_RETRY_TIMEOUT} milliseconds...`);
    setTimeout(init, CONNECTION_RETRY_TIMEOUT);
}


const connectToMeeting = (event: ChannelEvent) => {
    const { destinationNumber, participantUuid } = event;

    // Split meetingURI at the first dot. See https://stackoverflow.com/a/4607799/13431526.
    const [roomName, domainBase] = (destinationNumber || '').split(/\.(.+)$/s)

    domainBase && freeswitch.executeAsync('set', `sip_h_X-Domain-Base=${domainBase}`, participantUuid);
    freeswitch.executeAsync('multiset', `sip_h_X-Room-Name=${roomName} originate_timeout=3600 continue_on_fail=true`, participantUuid);
    freeswitch.executeAsync('bridge', `{absolute_codec_string=\${ep_codec_string}}[leg_timeout=3600]user/${jigasiSipUri}`, participantUuid);
    setCallState(event, CallState.WaitConference)
};

const handleBackgroundJob = (event: Event) => (event => {
    const { body, job, name } = event;

    Log.debug(`${name} event (${job}).`);
    switch (job) {
        case BackgroundJob.ShowCallsCount:
            stats.activeCalls = JSON.parse(body)['row_count'];
            break;

        case BackgroundJob.ShowRegistrations:
            stats.registrations = JSON.parse(body)['row_count'];
            break;

        case BackgroundJob.SofiaStatus:
            stats.internalProfileRunning = /internal.*profile.*RUNNING/.test(body);
            stats.externalProfileRunning = /external.*profile.*RUNNING/.test(body);
            break;
    }
})(new ChannelEvent(event));

const handleChannelBridge = (event: Event) => (event => {
    const { jigasiUuid, name, participantUuid } = event;

    Log.info(`${name} event with participantUuid (${participantUuid}) and jigasiUuid (${jigasiUuid}).`);

    if (jigasiUuid) {
        setCallState(event, CallState.Bridged);
        playAudioMessage(event, AudioMessage.ConferenceStarted);

        // Enable sending info messages to Jigasi.
        freeswitch.executeAsync('set', `api_result=\${uuid_setvar ${jigasiUuid} fs_send_unsupported_info true}`, jigasiUuid);

        // Have Freeswitch triggering digit action events.
        freeswitch.executeAsync('bind_digit_action', `userActions,*6,exec:event,Event-Name=${ChannelEventName.MuteToggle}`, participantUuid);
        freeswitch.executeAsync('bind_digit_action', `userActions,*9,exec:event,Event-Name=${ChannelEventName.HandRaiseToggle}`, participantUuid);
    } else Log.error(`${name} event for participantUuid (${participantUuid}) without a jigasiUuid (${jigasiUuid}). This is unexpected.`)
})(new ChannelEvent(event));

const handleChannelExecuteComplete = (event: Event) => (event => {
    const { application, applicationData, meetingIdInput, name, participantUuid } = event;

    if (application == 'play_and_get_digits') {
        if (applicationData?.includes(CustomChannelVariables.MeetingIdInput) && meetingIdInput) {
            Log.info(`${name} event of play_and_get_digits with participantUuid (${participantUuid}) and meetingIdInput (${meetingIdInput}).`);
            freeswitch.executeAsync('transfer', meetingIdInput, participantUuid);
        }
    }
})(new ChannelEvent(event));

const handleChannelHangup = (event: Event) => (event => {
    const { createdTime, destinationNumber, hangupCause, isBridged, isInbound, jigasiUuid, name, participantUuid } = event;

    const duration = Math.round((new Date().getTime() - createdTime) / 1000);

    Log.info(`${name} event from ${isInbound ? 'participant' : 'Jigasi'} with participantUuid (${participantUuid}) and jigasiUuid (${jigasiUuid}). Cause: ${hangupCause}, call duration: ${duration} seconds.`);
    setCallState(event, CallState.HungUp);
    if (isInbound) {
        // Participant hung up.
    } else if (isBridged && jigasiUuid) {
        // Jigasi hung up.
        if (hangupCause == 'USER_BUSY') {
            freeswitch.executeAsync('park', '', participantUuid);
            playAudioMessage(event, AudioMessage.PleaseWaitConferenceStartShortly);
            freeswitch.executeAsync('sched_transfer', `+30 ${destinationNumber}`, participantUuid);
        } else {
            freeswitch.executeAsync('sched_hangup', '+70 allotted_timeout', participantUuid);
            loopAudioMessage(event, AudioMessage.ConferenceEndedByHost);
        }
    }
})(new ChannelEvent(event));

const handleInboundCall = (event: Event) => (event => {
    const { destinationNumber, name, participantUuid } = event;

    if (!destinationNumber || destinationNumber == ivrNumber) {
        Log.info(`${name} event from participantUuid (${participantUuid}) to IVR (${destinationNumber}).`);
        freeswitch.executeAsync('answer', '', participantUuid);
        freeswitch.executeAsync('play_and_get_digits', `9 10 5 10000 =# ${AudioMessage.EnterYourMeetingId} ${AudioMessage.UnknownMeetingId} ${CustomChannelVariables.MeetingIdInput} \\d+ "1 XML hangup"`, participantUuid);
    } else {
        Log.info(`${name} event from participantUuid (${participantUuid}) to destinationNumber (${destinationNumber}).`);
        connectToMeeting(event);
    }
})(new ChannelEvent(event));

const handleMuteToggle = (event: Event) => (event => {
    const { avModeration: avModeration, muted, name, participantUuid } = event;

    Log.info(`${name} event with participantUuid (${participantUuid}): avModeration (${avModeration}), muted (${muted}).`);

    if (avModeration) {
        playAudioMessage(event, AudioMessage.NotAllowedToUnmute)
    } else {
        sendJigasiMuteRequest(event, !muted);
    }
})(new ChannelEvent(event));

const handleHandRaiseToggle = (event: Event) => (event => {
    const { handRaised, name, participantUuid } = event;

    Log.info(`${name} event with participantUuid (${participantUuid}) and handRaised (${handRaised}).`);
    setHandRaised(event, !handRaised);
})(new ChannelEvent(event));

const handleRecvInfo = (event: Event) => (event => {
    const { body, isJigasiEvent, jigasiMessage, jigasiUuid, name, participantUuid } = event;

    if (isJigasiEvent && jigasiUuid && jigasiMessage != undefined) {
        const jigasiMessageType = jigasiMessage[JigasiMessageHeader.Type];
        const jigasiMessageData = jigasiMessage[JigasiMessageHeader.Data];
        const { data, type } = jigasiMessage;

        Log.info(`${name} event with participantUuid (${participantUuid}) and jigasiUuid (${jigasiUuid}): jigasiMessageType ${jigasiMessageType}.`);

        // Some requests from Jigasi have a jigasiMessageType field, others have a type field.
        switch (jigasiMessageType) {
            case JigasiMessageType.AvModerationEnabled:
                if (typeof jigasiMessageData == 'boolean') {
                    setAvModeration(event, jigasiMessageData);
                }
                break;

            case JigasiMessageType.AvModerationApproved:
                playAudioMessage(event, AudioMessage.PleaseUnmute);
                setAvModeration(event, false);
                break;

            case JigasiMessageType.AvModerationDenied:
                setAvModeration(event, true);
                break;

            case JigasiMessageType.EndConference:
                freeswitch.executeAsync('hangup', 'conference_ended', jigasiUuid);
                break;

            case JigasiMessageType.LobbyJoined:
                setCallState(event, CallState.InLobby)
                loopAudioMessage(event, AudioMessage.PleaseWaitToJoinConference);
                break;

            case JigasiMessageType.LobbyLeft:
                setCallState(event, CallState.InConference)
                playAudioMessage(event, AudioMessage.YouAreInTheConference);
                break;

            case JigasiMessageType.LowerHand:
                setHandRaised(event, false);
                break;

            case JigasiMessageType.Rename:
                if (typeof jigasiMessageData == 'string') {
                    setNickname(event, jigasiMessageData);
                }
                break;
        }
        switch (type) {
            case 'muteRequest':
                // Received when a moderator mutes the participant.
                if (data) {
                    setMuted(event, data?.audio);
                    // Acknowledge the mute request.
                    sendJigasiInfoRequest(event, 'muteResponse', data);
                }
                break;
            case 'muteResponse':
                // Received in response to a mute request from the participant.
                if (data) {
                    // Store the new status and inform the participant.
                    setMuted(event, data?.audio);
                }
                break;
        }
    } else Log.debug(`${name} event not from Jigasi or with unknown message body: ${body}. Ignoring.`)
})(new ChannelEvent(event));

const handleSessionHeartbeat = (event: Event) => (event => {
    const { jigasiUuid, loopingAudioMessage, name, participantUuid } = event;

    Log.info(`${name} event with participantUuid (${participantUuid}) and jigasiUuid (${jigasiUuid}).`);
    loopingAudioMessage && playAudioMessage(event, loopingAudioMessage);
})(new ChannelEvent(event));

const pollStats = () => {
    freeswitch.bgapi(BackgroundJob.ShowCallsCount, '');
    freeswitch.bgapi(BackgroundJob.ShowRegistrations, '');
    freeswitch.bgapi(BackgroundJob.SofiaStatus, '');
}

init();
