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
    MeetingId = 'meeting_id',
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
    CallHeader = 'esl::event::CALL_HEADER::*',
    CallIVR = 'esl::event::CALL_IVR::*',
    MuteToggle = 'esl::event::MUTE_TOGGLE::*',
    RecvInfo = 'esl::event::RECV_INFO::*',
    SessionHeartbeat = 'esl::event::SESSION_HEARTBEAT::*',
}

export class ChannelEvent {
    avModeration;
    application;
    body;
    callState;
    createdTime;
    eslEvent;
    handRaised;
    hangupCause;
    isBridged;
    isInbound;
    isJigasiCall;
    isJigasiEvent;
    jigasiMessage: JigasiMessage | undefined;
    jigasiUuid;
    loopingAudioMessage;
    meetingId;
    meetingURI;
    muted;
    name;
    nickname;
    participantUuid;

    constructor(event: Event) {
        const {
            'Application': application,
            'Call-Direction': callDirection,
            'Caller-Callee-ID-Number': calleeIdNumber,
            'Caller-Channel-Created-Time': createdTime,
            'Event-Name': name,
            'Hangup-Cause': hangupCause,
            'Meeting-URI': meetingUri,
            'Other-Leg-Unique-ID': otherLegUniqueId,
            'SIP-From-User': sipFromUser,
            'variable_bridge_to': bridgedTo,
            'Unique-ID': uniqueId,

            [`variable_${CustomChannelVariables.AvModeration}`]: avModeration,
            [`variable_${CustomChannelVariables.CallState}`]: callState,
            [`variable_${CustomChannelVariables.HandRaised}`]: handRaised,
            [`variable_${CustomChannelVariables.LoopingAudioMessage}`]: loopingAudioMessage,
            [`variable_${CustomChannelVariables.MeetingId}`]: meetingId,
            [`variable_${CustomChannelVariables.Muted}`]: muted,
            [`variable_${CustomChannelVariables.Nickname}`]: nickname,
        } = event.headers;

        this.application = application;
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
        this.meetingId = meetingId;
        this.meetingURI = meetingUri;
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

        if (this.name == 'RECV_INFO' && this.isJigasiEvent && this.body) {
            try {
                this.jigasiMessage = JSON.parse(this.body);
            } catch (err) {
                Log.warn('RECV_INFO event from Jigasi with unknown message body:', this.body);
            }
        }
    }
}
