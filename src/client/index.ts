import { IConfig, IVoiceMode, VoiceTarget } from './types'
import { debugMessage, showAboveRadarMessage } from './utils';

export const config: IConfig = JSON.parse(LoadResourceFile(GetCurrentResourceName(), "config/shared.json"))

const voiceModes: IVoiceMode[] = config.voiceModes

class pVoice {
    private mode: number = 1;
    private notificationId: number = 0;

    private phoneTargets: number[] = [];
    private radioTargets: number[] = [];

    private radioChannel: number = -1
    private tokoChannels: any[] = []

    constructor() {
        debugMessage("Config file loaded!")
        console.log(config)
        if (config.debug) {
            this.loadDebug()
        }

        if (config.enableTokovoipWrapper) {
            this.loadTokovoip()
        }

        this.loadEvents()
        this.registerSwitchVoiceKey()

        RequestAnimDict("random@arrests")
        setTick(this.onTick.bind(this))
    }

    private registerSwitchVoiceKey() {
        RegisterKeyMapping("+switchVoiceMode", config.phrases.switchVoiceMode, "keyboard", config.switchModeDefaultKey)
        RegisterCommand("+switchVoiceMode", this.switchVoiceMode.bind(this), false)
        RegisterCommand("-switchVoiceMode", function() {}, false)
    }

    public switchVoiceMode() {
        let newModeIndex = this.mode + 1
        let newMode: IVoiceMode = voiceModes[newModeIndex]
        const ped = PlayerPedId()

        while (!newMode || (newMode.canUse && !newMode.canUse(ped))) {
            newModeIndex = newModeIndex < voiceModes.length ? newModeIndex + 1 : 0
            newMode = voiceModes[newModeIndex]
        }

        this.mode = newModeIndex
        NetworkSetTalkerProximity(newMode.distance)

        if (this.notificationId)
            RemoveNotification(this.notificationId)

        this.notificationId = showAboveRadarMessage(`${config.phrases.switchModeNotif} \n~g~${newMode.name}~w~.`)
    }

    public togglePhoneTarget(playerServerId: number, enabled: boolean, ) {
        const playerId = GetPlayerFromServerId(playerServerId)

        if (enabled) {
            MumbleSetVolumeOverride(playerId, 1.0)
            MumbleAddVoiceTargetPlayer(VoiceTarget.PHONE, playerId)

            this.phoneTargets.push(playerServerId)

            // me!
            MumbleSetVoiceTarget(VoiceTarget.PHONE)
        } else {
            // todo verify if not in radio
            MumbleSetVolumeOverride(playerId, -1.0)
            MumbleClearVoiceTarget(VoiceTarget.PHONE)

            const index = this.phoneTargets.findIndex((v) => v === playerServerId)
            if (index !== -1)
                this.phoneTargets.splice(index, 1)
        }
    }
    public toggleRadioTarget(playerServerId: number, enabled: boolean) {
        const playerId = GetPlayerFromServerId(playerServerId)

        if (enabled) {
            MumbleSetVolumeOverride(playerId, 1.0)
            MumbleAddVoiceTargetPlayer(VoiceTarget.RADIO, playerId)

            this.radioTargets.push(playerServerId)

            // me!
            MumbleSetVoiceTarget(VoiceTarget.RADIO)
        } else {
            // todo verify if not in call
            MumbleSetVolumeOverride(playerId, -1.0)

            const index = this.radioTargets.findIndex((v) => v === playerServerId)
            if (index !== -1)
                this.radioTargets.splice(index, 1)
        }
    }

    private loadDebug() {
        const a = this
        RegisterCommand("tRt", function(src: number, args: string[]) {
            a.toggleRadioTarget(Number(args[0]), args[1] !== undefined)
        }, false)

        RegisterCommand("tPt", function(src: number, args: string[]) {
            a.togglePhoneTarget(Number(args[0]), args[1] !== undefined)
        }, false)
    }

    private switchTokoChannelStyle() {
        const previousChannel = this.radioChannel
        if (previousChannel < this.tokoChannels.length) {
            this.radioChannel++
            if (this.radioChannel === this.tokoChannels.length) {
                this.radioChannel = -1
                TriggerServerEvent("pvoice_s:removePlayerFromRadio", previousChannel)
            } else {
                TriggerServerEvent("pvoice_s:addPlayerToRadio", this.radioChannel)
            }
        }
    }

    private loadTokovoip() {
        exports("addPlayerToRadio", function(channel: any) {
            TriggerServerEvent("TokoVoip:addPlayerToRadio", channel)
        })

        exports("removePlayerFromRadio", function(channel: any) {
            TriggerServerEvent("TokoVoip:removePlayerFromRadio", channel)
        })

        RegisterKeyMapping("+switchTokoChannel", config.phrases.switchRadioChannel, "keyboard", config.switchRadioDefaultKey)
        RegisterCommand("+switchTokoChannel", this.switchTokoChannelStyle.bind(this), false)
        RegisterCommand("-switchTokoChannel", function() {}, false)

        const channels = JSON.parse(LoadResourceFile(GetCurrentResourceName(), "config/tokovoipconfig.json"))
        this.tokoChannels = channels.channels
    }

    private addPlayerToRadio(newMember: number) {
        debugMessage(`addPlayerToRadio - ${newMember}`)
        this.toggleRadioTarget(newMember, true)
    }

    private addPlayersToRadio(members: number[], channel: number) {
        debugMessage(`addPlayersToRadio - ${channel} - ${JSON.stringify(members)}`)
        this.radioChannel = channel

        const channelName = this.tokoChannels[channel] ? this.tokoChannels[channel].name : String(channel);
        showAboveRadarMessage(`You joined ${channelName}.`)
        members.forEach((member) => this.toggleRadioTarget(member, true))
    }

    private removePlayerFromRadio(serverId: number) {
        debugMessage(`removePlayerFromRadio - ${serverId}`)
        this.toggleRadioTarget(serverId, false)
    }

    private removeRadio() {
        debugMessage(`removeRadio`)
        this.radioTargets.forEach((member) => {
            const memberPlayer = GetPlayerFromServerId(member)
            if (memberPlayer !== -1)
                MumbleSetVolumeOverride(memberPlayer, -1.0)
        })

        this.radioTargets = []
        this.radioChannel = -1
        MumbleClearVoiceTarget(VoiceTarget.RADIO)
    }

    private loadEvents() {
        addNetEventListener("pvoice:addPlayerToRadio", this.addPlayerToRadio.bind(this))
        addNetEventListener("pvoice:addPlayersToRadio", this.addPlayersToRadio.bind(this))
        addNetEventListener("pvoice:removePlayerFromRadio", this.removePlayerFromRadio.bind(this))
        addNetEventListener("pvoice:removeRadio", this.removeRadio.bind(this))
    }

    private radioAnim: boolean = false;
    private onTick() {
        if (this.radioChannel !== -1 && !this.radioAnim && IsControlJustPressed(0, 249)) {
            this.radioAnim = true
            TaskPlayAnim(PlayerPedId(),"random@arrests","generic_radio_chatter", 8.0, 0.0, -1, 49, 0, false, false, false);
        }

        if (this.radioAnim && IsControlJustReleased(0, 249)) {
            this.radioAnim = false
            StopAnimTask(PlayerPedId(), "random@arrests","generic_radio_chatter", -4.0)
        }
    }
}

const pvoice = new pVoice()