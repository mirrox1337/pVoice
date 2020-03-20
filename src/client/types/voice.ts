export interface IVoiceMode {
    name: string,
    distance: number,
    canUse?: Function
}

export enum VoiceTarget {
    DEFAULT,
    SESSION,
    RADIO,
    PHONE
}