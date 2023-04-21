import * as crypto from 'node:crypto';

import freeswitch from './freeswitch';
import { AudioMessage } from './audioMessage';
import { ChannelEvent, CustomChannelVariables } from './event';

export enum CallState {
    Init = 'init',
    WaitConference = 'wait_conference',
    Bridged = 'bridged',
    InLobby = 'in_lobby',
    InConference = 'in_conference',
    HungUp = 'hung_up',
}

const LOOP_AUDIO_MESSAGE_TIME = '30'; // in seconds

export const playAudioMessage = (event: ChannelEvent, message: AudioMessage) => {
    const { participantUuid } = event;

    freeswitch.bgapi(`uuid_broadcast ${participantUuid} ${message}`, participantUuid);
}

export const loopAudioMessage = (event: ChannelEvent, message: AudioMessage) => {
    const { participantUuid } = event;

    freeswitch.executeAsync('set', `${CustomChannelVariables.LoopingAudioMessage}=${message}`, participantUuid);
    freeswitch.executeAsync('enable_heartbeat', LOOP_AUDIO_MESSAGE_TIME, participantUuid);
    playAudioMessage(event, message);
}

export const sendJigasiInfoRequest = (event: ChannelEvent, type: string, data: object) => {
    const { jigasiUuid } = event;

    if (jigasiUuid) {
        const request = {
            id: crypto.randomUUID(),
            type,
            status: 'OK', // Required for muteResponse
            data,
        };
        freeswitch.bgapi(`uuid_send_info ${jigasiUuid} application json ${JSON.stringify(request)}`, jigasiUuid);
    }
}

export const sendJigasiMuteRequest = (event: ChannelEvent, muted = true) => {
    const data = { audio: muted };

    sendJigasiInfoRequest(event, 'muteRequest', data);
}

const sendJigasiHandRaiseRequest = (event: ChannelEvent, handRaised = false) => {
    const data = { handRaised: handRaised };

    sendJigasiInfoRequest(event, 'handRequest', data);
}

export const setAvModeration = (event: ChannelEvent, avModeration: boolean) => {
    freeswitch.executeAsync('set', `${CustomChannelVariables.AvModeration}=${avModeration}`, event.participantUuid);
}

export const setCallState = (event: ChannelEvent, callState: CallState) => {
    const { participantUuid } = event;

    if (callState != event.callState) {
        // Stop looping audio message on a state change.
        // Enable_heartbeat does not allow value 0 to stop (it would default to 60).
        // Therefore setting the period to 10 hours as a workaround.
        freeswitch.executeAsync('enable_heartbeat', '36000', participantUuid);
        freeswitch.executeAsync('unset', `${CustomChannelVariables.LoopingAudioMessage}`, participantUuid);
        freeswitch.executeAsync('set', `${CustomChannelVariables.CallState}=${callState}`, participantUuid);
    }
}

export const setHandRaised = (event: ChannelEvent, handRaised: boolean) => {
    freeswitch.executeAsync('set', `${CustomChannelVariables.HandRaised}=${handRaised}`, event.participantUuid);
    sendJigasiHandRaiseRequest(event, handRaised);
    playAudioMessage(event, handRaised ? AudioMessage.HandIsRaised : AudioMessage.HandIsLowered);
}

export const setMuted = (event: ChannelEvent, muted: boolean) => {
    freeswitch.executeAsync('set', `${CustomChannelVariables.Muted}=${muted}`, event.participantUuid);
    playAudioMessage(event, muted ? AudioMessage.YouAreMuted : AudioMessage.YouAreUnmuted);
}

export const setNickname = (event: ChannelEvent, nickname: string) => {
    const data = { nickname };

    sendJigasiInfoRequest(event, 'renameRequest', data);
    freeswitch.executeAsync('set', `${CustomChannelVariables.Nickname}=${nickname}`, event.participantUuid);
}
