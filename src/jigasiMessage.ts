/**
 * The header and types for Jigasi JSON requests in sip info messages.
 */

export enum JigasiMessageHeader {
    Data = 'd',
    Id = 'i',
    Type = 't',
}

export enum JigasiMessageType {
    AvModerationApproved = 9,
    AvModerationEnabled = 8,
    AvModerationDenied = 10,
    EndConference = 12,
    LobbyAllowedJoin = 6,
    LobbyJoined = 3,
    LobbyLeft = 5,
    LobbyRejectedJoin = 7,
    LowerHand = 13,
    Rename = 14,
    RequestRoomAccess = 4,
}

export type JigasiMessage = {
    [JigasiMessageHeader.Data]?: boolean | string;
    [JigasiMessageHeader.Id]: number;
    [JigasiMessageHeader.Type]: JigasiMessageType;
    data?: Record<string, boolean>;
    type?: string;
}
