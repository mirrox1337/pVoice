import { config } from "../index"

const resourceName = "pVoice"

export const debugMessage = (message: string) => {
    if (!config.debug) return;
    console.log(`^2[${resourceName}] ^3${message}^7\n`)
}

export const showAboveRadarMessage = (message: string, back?: number): number => {
    if (back)
        ThefeedNextPostBackgroundColor(back)

    SetNotificationTextEntry("jamyfafi")
    AddTextComponentString(message)

    return DrawNotification(false, true)
}