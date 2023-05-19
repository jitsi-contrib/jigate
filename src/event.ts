import { Event } from 'modesl';
import { AudioMessage } from './audioMessage';
import { JigasiMessage } from './jigasiMessage';
import Log from './log';

const JIGASI_USER_ID = process.env.JIGASI_SIP_URI?.split('@')[0];

export enum CustomChannelVariables {
    AvModeration = 'av_moderation',
    CallState = 'call_state',
    HandRaised = 'hand_raised',
    LoopingAudioMessage = 'looping_audio_message',
    MeetingIdInput = 'meeting_id_input',
    Muted = 'muted',
    Nickname = 'nickname',
}

export enum ChannelEventName {
    ChannelBridge = 'CHANNEL_BRIDGE',
    ChannelExecuteComplete = 'CHANNEL_EXECUTE_COMPLETE',
    ChannelHangup = 'CHANNEL_HANGUP',
    HandRaiseToggle = 'HAND_RAISE_TOGGLE',
    JigasiCall = 'JIGASI_CALL',
    MuteToggle = 'MUTE_TOGGLE',
    RecvInfo = 'RECV_INFO',
    SessionHeartbeat = 'SESSION_HEARTBEAT',
}

export enum EventFilter {
    AllSubscription = 'all',
    Any = 'esl::event::*::*',
    ChannelBridge = 'esl::event::CHANNEL_BRIDGE::*',
    ChannelExecuteComplete = 'esl::event::CHANNEL_EXECUTE_COMPLETE::*',
    ChannelHangup = 'esl::event::CHANNEL_HANGUP::*',
    HandRaiseToggle = 'esl::event::HAND_RAISE_TOGGLE::*',
    Heartbeat = 'esl::event::HEARTBEAT::*',
    InboundCall = 'esl::event::INBOUND_CALL::*',
    MuteToggle = 'esl::event::MUTE_TOGGLE::*',
    RecvInfo = 'esl::event::RECV_INFO::*',
    SessionHeartbeat = 'esl::event::SESSION_HEARTBEAT::*',
}

export class ChannelEvent {
    avModeration: boolean;
    application: string | undefined;
    applicationData: string | undefined;
    body: string;
    callState: string | undefined;
    createdTime: number;
    destinationNumber: string | undefined;
    eslEvent: Event;
    handRaised: boolean;
    hangupCause: string | undefined;
    isBridged: boolean;
    isInbound: boolean;
    isJigasiCall: boolean;
    isJigasiEvent: boolean;
    jigasiMessage: JigasiMessage | undefined;
    jigasiUuid: string | undefined;
    loopingAudioMessage: AudioMessage;
    meetingIdInput: string | undefined;
    muted: boolean;
    name: string | undefined;
    nickname: string | undefined;
    participantUuid: string;

    constructor(event: Event) {
        const {
            'Application': application,
            'Application-Data': applicationData,
            'Call-Direction': callDirection,
            'Caller-Callee-ID-Number': calleeIdNumber,
            'Caller-Channel-Created-Time': createdTime,
            'Caller-Destination-Number': callerDestinationNumber,
            'Event-Name': name,
            'Hangup-Cause': hangupCause,
            'Other-Leg-Destination-Number': otherLegDestinationNumber,
            'Other-Leg-Unique-ID': otherLegUniqueId,
            'SIP-From-User': sipFromUser,
            'variable_bridge_to': bridgedTo,
            'Unique-ID': uniqueId,

            [`variable_${CustomChannelVariables.AvModeration}`]: avModeration,
            [`variable_${CustomChannelVariables.CallState}`]: callState,
            [`variable_${CustomChannelVariables.HandRaised}`]: handRaised,
            [`variable_${CustomChannelVariables.LoopingAudioMessage}`]: loopingAudioMessage,
            [`variable_${CustomChannelVariables.MeetingIdInput}`]: meetingIdInput,
            [`variable_${CustomChannelVariables.Muted}`]: muted,
            [`variable_${CustomChannelVariables.Nickname}`]: nickname,
        } = event.headers;

        this.application = application;
        this.applicationData = applicationData;
        this.avModeration = avModeration == 'true';
        this.body = event.getBody();
        this.callState = callState;
        this.createdTime = parseInt(createdTime||'0') / 1000;
        this.eslEvent = event;
        this.handRaised = handRaised == 'true';
        this.hangupCause = hangupCause;
        this.isBridged = bridgedTo !== null;
        this.isInbound = callDirection == 'inbound';
        this.isJigasiCall = calleeIdNumber == JIGASI_USER_ID;
        this.isJigasiEvent = sipFromUser == JIGASI_USER_ID;
        this.loopingAudioMessage = loopingAudioMessage as AudioMessage;
        this.meetingIdInput = meetingIdInput;
        this.muted = muted == 'true';
        this.name = name;
        this.nickname = nickname;

        // Depending on the origin of an event we have:
        // Inbound:
        //    SIP Phone --[A leg / uniqueId]--> FreeSwitch --[B leg / otherLegUniqueId]--> Jigasi
        // Outbound:
        //    Jigasi --[A leg / uniqueId ]--> FreeSwitch --[B leg / otherLegUniqueId]--> SIP Phone
        this.jigasiUuid = this.isInbound ? otherLegUniqueId : uniqueId;
        // The participant uuid should always exist. So it should never really be empty.
        // This is just to make TypeScript aware that it is always a string.
        this.participantUuid = (this.isInbound ? uniqueId : otherLegUniqueId)||'';
        this.destinationNumber = this.isInbound ? callerDestinationNumber : otherLegDestinationNumber;

        if (this.name == 'RECV_INFO' && this.isJigasiEvent && this.body) {
            try {
                this.jigasiMessage = JSON.parse(this.body);
            } catch (err) {
                Log.warn(`RECV_INFO event from Jigasi with unknown message body: ${this.body}`);
            }
        }
    }
}
