import { IConfig, IRadioChannel } from './types'
import { debugMessage } from './utils';

export const config: IConfig = JSON.parse(LoadResourceFile(GetCurrentResourceName(), "config/shared.json"))

SetConvarReplicated("use3dAudio", config.use3dAudio ? "true" : "false")
SetConvarReplicated("useSendingRangeOnly", config.useSendingRangeOnly ? "true" : "false")

class pVoice {
    private radios: IRadioChannel[] = []

    constructor() {
        debugMessage("Config file loaded!")

        if (config.enableTokovoipWrapper) {
            this.loadTokovoip()
        }

        this.loadEvents()
    }

    private addPlayerToRadio(serverId: number, channelId: number) {
        // ensure that the player is not in another radio
        // ugly, but we have to use it due to tokoshit
        this.removePlayerFromRadio(serverId, channelId)

        debugMessage(`addPlayerToRadio - ${serverId} - ${channelId}`)
        let index = this.radios.findIndex((v) => v.channel === channelId)
        if (index === -1) {
            index = this.radios.length
            this.radios.push({ channel: channelId, players: [] })
        }

        this.radios[index].players.forEach((id) => TriggerClientEvent("pvoice:addPlayerToRadio", id, serverId))
        TriggerClientEvent("pvoice:addPlayersToRadio", serverId, this.radios[index].players, this.radios[index].channel)

        this.radios[index].players.push(serverId)
    }

    private removePlayerFromRadio(serverId: number, channelId: number) {
        debugMessage(`removePlayerFromRadio - ${serverId} - ${channelId}`)
        let index = this.radios.findIndex((v) => v.channel === channelId)
        if (index !== -1) {
            const playerIndex = this.radios[index].players.findIndex((v) => v === serverId)
            if (playerIndex !== -1) {
                this.radios[index].players.splice(playerIndex, 1)
            }
        }

        if (this.radios[index])
            this.radios[index].players.forEach((id) => TriggerClientEvent("pvoice:removePlayerFromRadio", id, serverId))

        TriggerClientEvent("pvoice:removeRadio", serverId)
    }

    private loadTokovoip() {
        const t = this
        addNetEventListener("TokoVoip:removePlayerFromRadio", function(channel: number) {
            const source = (global as any).source
            t.removePlayerFromRadio(source, channel)
        })

        addNetEventListener("TokoVoip:addPlayerToRadio", function(channel: number) {
            const source = (global as any).source
            t.addPlayerToRadio(source, channel)
        })

        const channels = JSON.parse(LoadResourceFile(GetCurrentResourceName(), "config/tokovoipconfig.json"))
        this.radios = channels.channels
    }

    private loadEvents() {
        const t = this
        addNetEventListener("pvoice_s:removePlayerFromRadio", function(channel: number) {
            const source = (global as any).source
            t.removePlayerFromRadio(source, channel)
        })

        addNetEventListener("pvoice_s:addPlayerToRadio", function(channel: number) {
            const source = (global as any).source
            t.addPlayerToRadio(source, channel)
        })
    }
}

const pvoice = new pVoice()