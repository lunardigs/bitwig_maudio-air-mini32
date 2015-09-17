#bitwig_maudio-air-mini32 - 2.0 beta

##Bitwig 1.x.x controller script for the M-Audio Axion A.I.R. Mini32

**WARNING:** UPON LOADING THIS SCRIPT, A SYSEX MESSAGE WILL BE SENT WHICH WILL OVERWRITE MEMORY SLOT 0 (ZERO) ON YOUR MINI32. No other memory slots will be affected. The reason for doing this is that the Mini32's default knob-CC assignments (CC 1-8) overlaps standard MIDI funtions that will interfere with recodings.

---

The Mini32 is a simple, light weight, 32 key keyboard controller with 8 drum pads, 8 CC knobs, plus a number a nice features. It's great for travel and it's very playable.

#Functions

###Transport
* stop = stop
* play = play
* rec = rec
* shift + stop = mute selected track
* shift + play = solo selected track
* shift + rec = arm selected track

###Mode-independent functions
* middle button = shift
* sub-mode button = cycle sub-mode of current mode
* shift + sub-mode button = cycle mode
* shift + up = toggle metronome
* shift + down = toggle overdub (OVR)
* shift + left = undo
* shift + right = redo

###TRACK mode

#####Cursor buttons:
* up/down = track select
* right/left = device select
* mode button (above cursor buttons, left of knobs) = change sub-mode
  * CURSOR sub-mode = CC control knobs to cursor selected track
    * knob 1 = volume
    * knob 2 = Pan
    * knob 3 = send 1
    * knob 4 = send 2
    * knob 5 = unassigned
    * knob 6 = unassigned
    * knob 7 = click (metronome) volume
    * knob 8 = project tempo (fixed range: 50 to 176 BPM)
  * DEVICE sub-mode = CC control knobs to macro 1-8 of cursor selected device

###MIXER mode

#####Cursor buttons:
* up/down = change panel focus to above or below current
* right/left = cursor right/left within the panel focus
* mode button (above cursor buttons, left of knobs) = change sub-mode
  * VOLUME sub-mode = CC control knobs to track 1-8 volume adjust
  * PAN sub-mode = CC control knobs to track 1-8 pan adjust
  * SEND 1 sub-mode = CC control knobs to track 1-8 send 1 adjust
  * SEND 2 sub-mode = CC control knobs to track 1-8 send 2 adjust
  * DEVICE sub-mode = CC control knobs to macro 1-8 of cursor selected device

##Notes
1. **Setup:** It is necessary to set the Mini32's incoming and outgoing MIDI ports, both 1 & 2 for proper operation. The reason for this is that m-audio has made it such that the "sub-mode" button sends data to port 2, while everything else (for purposes of this script) arrive on port 1. Later versions of this script may eliminate this necessity.
2. Knobs in MIXER mode presently are fixed to tracks 1-8. Later versions will utilize Track Banks to enhance this function and remove this limit.
