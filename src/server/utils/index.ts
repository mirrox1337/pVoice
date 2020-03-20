import { config } from "../index"

const resourceName = "pVoice"

export const debugMessage = (message: string) => {
    if (!config.debug) return;
    console.log(`^2[${resourceName}] ^3${message}^7\n`)
}