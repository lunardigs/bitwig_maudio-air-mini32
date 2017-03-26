// M-Audio Axiom A.I.R. Mini32

loadAPI(1);

host.defineController("MAudio", "Axiom A.I.R. Mini32", "2.1", "b73308a0-0c0e-11e7-9598-0800200c9a66");
host.defineMidiPorts(2, 2); // Mini32 MIDI ports
host.addDeviceNameBasedDiscoveryPair(["Axiom A.I.R. Mini32 MIDI 1", "Axiom A.I.R. Mini32 MIDI 2"], ["Axiom A.I.R. Mini32 MIDI 1", "Axiom A.I.R. Mini32 MIDI 2"]);

var LOWEST_CC = 1;
var HIGHEST_CC = 119;

var ccValue = initArray(0, ((HIGHEST_CC - LOWEST_CC + 1)*16));
var ccValueOld = initArray(0, ((HIGHEST_CC - LOWEST_CC + 1)*16));

var M32 = {
    MODE: 58, // MODE button
    isMode: 0,
    isSubMode: 1,
    isPreroll: 0,
    modeName: [ARRANGER = ["ARRANGER", "TRACK", "DEVICE"], MIXER = ["MIXER", "VOLUME", "PAN", "DEVICE", "SEND 1", "SEND 2", "SEND 3", "SEND 4", "SEND 5", "SEND 6", "SEND 7", "SEND 8"]], // Modes and respective subModes nested array
    selectedTrack: 0,
    UP: 19,
    DOWN: 20,
    SHIFT: 23, // SHIFT button
    isShift: false,
    tapTempoNote: 36,
    LEFT: 22,
    RIGHT: 21,
    STOP: 16,
    PLAY: 17,
    REC: 18,
    KNOB_1: 24,
    KNOB_2: 25,
    KNOB_3: 26,
    KNOB_4: 27,
    KNOB_5: 28,
    KNOB_6: 29,
    KNOB_7: 30,
    KNOB_8: 31,
    KNOB_START_CC: 24,
    KNOB_END_CC: 31,
};

// CC range functions
function inKnobRange(cc) {
    return cc >= M32.KNOB_START_CC && cc <= M32.KNOB_END_CC;
}

// Initialize
function init()
{
    M32.note = host.getMidiInPort(0).createNoteInput("Keys", "90????", "E000??", "B0????");
    M32.note.setShouldConsumeEvents(false);

    host.getMidiInPort(0).setMidiCallback(onMidi0);
    host.getMidiInPort(1).setMidiCallback(onMidi1);

    /*
    Send init SysEx
    WARNING: UPON LOADING THIS SCRIPT, THE FOLLOWING LINE WILL OVERWRITE MEMORY SLOT 0 (ZERO) ON YOUR MINI32. No other memory slots will be affected. The reason for initalizing slot 0 is because the Mini32's default knob-CC assignments (CC 1-8) overlaps standard MIDI funtions that will interfere with recodings.
    */
    host.getMidiOutPort(0).sendSysex("f0 00 01 05 20 7f 7f 00 00 00 01 00 10 00 10 00 00 00 00 00 00 00 09 00 00 00 00 00 40 00 00 00 7f 00 00 01 04 00 00 00 7f 00 40 00 01 00 00 00 7f 00 40 00 18 00 00 00 7f 00 19 00 00 00 7f 00 1a 00 00 00 7f 00 1b 00 00 00 7f 00 1c 00 00 00 7f 00 1d 00 00 00 7f 00 1e 00 00 00 7f 00 1f 00 00 00 7f 00 10 00 00 00 7f 00 11 00 00 00 7f 00 12 00 00 00 7f 00 13 00 00 00 7f 00 14 00 00 00 7f 00 15 00 00 00 7f 00 16 00 00 00 7f 00 17 00 00 00 7f 00 24 00 25 00 26 00 27 00 28 00 29 00 2a 00 2b 00 2c 00 2d 00 2e 00 2f 00 30 00 31 00 32 00 33 00 00 00 00 00 00 f7");

    // Create host objects
    M32.application = host.createApplication();
    M32.transport = host.createTransport();
    M32.cursorTrack = host.createCursorTrack(8, 8);
    M32.trackBank = host.createMainTrackBank(8, 8, 8);
    M32.masterTrack0 = host.createMasterTrack(0);
    M32.cursorDevice = host.createCursorDeviceSection(8);
    M32.userControls = host.createUserControls((HIGHEST_CC - LOWEST_CC + 1)*16); // Make CCs 1-119 freely mappable for all 16 Channels

    for(var i = LOWEST_CC; i <= HIGHEST_CC; i++) {
        for (var j = 1; j <= 16; j++) {
            var c = i - LOWEST_CC + (j - 1) * (HIGHEST_CC-LOWEST_CC + 1);
            M32.userControls.getControl(c).setLabel("CC " + i + " - Channel " + j);
            //M32.userControls.getControl(c).addValueObserver(127, getValueObserverFunc(c, ccValue));
        }
    }
    
    for (var p = 0; p < 8; p++) {
        macro = M32.cursorDevice.getMacro(p).setIndication(true);
        track = M32.trackBank.getChannel(p);
    }
}

// MIDI Events
function onMidi0(status, data1, data2) // onMidi0 events
{
    //println("Midi 0")
    //printMidi(status, data1, data2);

    // Shift button pressed status
    switch (data1) {
        case M32.SHIFT:
            M32.isShift = data2 != 0;
            //M32.note.sendRawMidiEvent(0, 0, 0);
            break;
    }
    
    // MASTER section controls, accessible in any mode 
    if (M32.isShift) 
    {
        switch (data1) {
            case M32.KNOB_5:
                //TBD
                break;
                
            case M32.KNOB_6: // Course tempo adjustment
                M32.transport.getTempo().setRaw(data2 + 20);
                break;
                
            case M32.KNOB_7: // Adjust click volume
                M32.transport.setMetronomeValue(data2, 128);
                metroVolume = Math.round((data2 / 127) * 100);
                host.showPopupNotification("Click Volume: " + metroVolume + " %");
                break;

            case M32.KNOB_8: // Master volume knob
                M32.masterTrack0.getVolume().set(data2, 128);
                break;
        }
    }
    
    // ARRANGER mode knobs for selected track
    if (M32.modeName[M32.isMode] == ARRANGER && M32.modeName[M32.isMode][M32.isSubMode] == "TRACK") 
    {
        if (status == 176 && data2 != 0) // ignore button release
        {
            switch (data1) {
                case M32.KNOB_1: // Volume selected track
                    M32.cursorTrack.getVolume().set(data2, 128);
                    break;

                case M32.KNOB_2: // Pan selected track
                    M32.cursorTrack.getPan().set(data2, 128);
                    break;

                case M32.KNOB_3: // Send 1 selected track
                    M32.cursorTrack.getSend(0).set(data2, 128);
                    break;

                case M32.KNOB_4: // Send 2 selected track
                    M32.cursorTrack.getSend(1).set(data2, 128);
                    break;

                case M32.KNOB_5:
                    M32.cursorTrack.getSend(2).set(data2, 128);
                    break;

                case M32.KNOB_6:
                    M32.cursorTrack.getSend(3).set(data2, 128);
                    break;

                case M32.KNOB_7:
                    M32.cursorTrack.getSend(4).set(data2, 128);
                    break;

                case M32.KNOB_8: 
                    M32.cursorTrack.getSend(5).set(data2, 128);
                    break;
            }
        }
    }

    // MIXER mode knobs for selected trackBank
    if (M32.modeName[M32.isMode] == MIXER && M32.modeName[M32.isMode][M32.isSubMode] == "VOLUME")
    {
        if (status == 176 && inKnobRange(data1) && M32.isShift == false)
            {
                M32.trackBank.getChannel(data1 - M32.KNOB_START_CC).getVolume().set(data2, 128);
            }
    }
    
    if (M32.modeName[M32.isMode] == MIXER && M32.modeName[M32.isMode][M32.isSubMode] == "PAN")
    {
        if (status == 176 && inKnobRange(data1) && M32.isShift == false)
            {
                M32.trackBank.getChannel(data1 - M32.KNOB_START_CC).getPan().set(data2, 128);
            }
    }
    
    if (M32.modeName[M32.isMode] == MIXER && M32.modeName[M32.isMode][M32.isSubMode] == "SEND 1")
    {
        if (status == 176 && inKnobRange(data1) && M32.isShift == false)
            {
                M32.trackBank.getChannel(data1 - M32.KNOB_START_CC).getSend(0).set(data2, 128);
            }
    }

    if (M32.modeName[M32.isMode] == MIXER && M32.modeName[M32.isMode][M32.isSubMode] == "SEND 2")
    {
        if (status == 176 && inKnobRange(data1) && M32.isShift == false)
            {
                M32.trackBank.getChannel(data1 - M32.KNOB_START_CC).getSend(1).set(data2, 128);
            }
    }

    if (M32.modeName[M32.isMode] == MIXER && M32.modeName[M32.isMode][M32.isSubMode] == "SEND 3")
    {
        if (status == 176 && inKnobRange(data1) && M32.isShift == false)
            {
                M32.trackBank.getChannel(data1 - M32.KNOB_START_CC).getSend(2).set(data2, 128);
            }
    }
    
    if (M32.modeName[M32.isMode] == MIXER && M32.modeName[M32.isMode][M32.isSubMode] == "SEND 4")
    {
        if (status == 176 && inKnobRange(data1) && M32.isShift == false)
            {
                M32.trackBank.getChannel(data1 - M32.KNOB_START_CC).getSend(3).set(data2, 128);
            }
    }
    
    if (M32.modeName[M32.isMode] == MIXER && M32.modeName[M32.isMode][M32.isSubMode] == "SEND 5")
    {
        if (status == 176 && inKnobRange(data1) && M32.isShift == false)
            {
                M32.trackBank.getChannel(data1 - M32.KNOB_START_CC).getSend(4).set(data2, 128);
            }
    }
    
    if (M32.modeName[M32.isMode] == MIXER && M32.modeName[M32.isMode][M32.isSubMode] == "SEND 6")
    {
        if (status == 176 && inKnobRange(data1) && M32.isShift == false)
            {
                M32.trackBank.getChannel(data1 - M32.KNOB_START_CC).getSend(5).set(data2, 128);
            }
    }

    if (M32.modeName[M32.isMode] == MIXER && M32.modeName[M32.isMode][M32.isSubMode] == "SEND 7")
    {
        if (status == 176 && inKnobRange(data1) && M32.isShift == false)
            {
                M32.trackBank.getChannel(data1 - M32.KNOB_START_CC).getSend(6).set(data2, 128);
            }
    }
    
    if (M32.modeName[M32.isMode] == MIXER && M32.modeName[M32.isMode][M32.isSubMode] == "SEND 8")
    {
        if (status == 176 && inKnobRange(data1) && M32.isShift == false)
            {
                M32.trackBank.getChannel(data1 - M32.KNOB_START_CC).getSend(7).set(data2, 128);
            }
    }
    
    //Macro KNOBS for selected device
    if (M32.modeName[M32.isMode][M32.isSubMode] == "DEVICE") // Check if DEVICE submode
    {
        if (inKnobRange(data1))
        {
            M32.cursorDevice.getMacro(data1 - M32.KNOB_START_CC).getAmount().set(data2, 128);
        }
    }
   
    //Transport and cursor for tracks (up, down) and devices (left, right)
    if (data2 > 0) // ignore button release
    {
        switch (data1) {
            case M32.PLAY: // Play = play. Play + shift = solo selected track
                M32.isShift ? M32.cursorTrack.getSolo().toggle() : M32.transport.play();
                break;

            case M32.STOP: // Stop = Stop. Stop + shift = mute selected track
                M32.isShift ? M32.cursorTrack.getMute().toggle() : M32.transport.stop();
                break;

            case M32.REC: // Rec = Record. Rec + shift = arm selected track
                M32.isShift ? M32.cursorTrack.getArm().toggle() : M32.transport.record();
                break;

            case M32.UP: // Up = previous track. Up + shift = metronome toggle
                M32.isShift ? M32.transport.toggleOverdub() : cursorAction(M32.UP);
                break;

            case M32.DOWN: // Down = next track
                M32.isShift ? M32.transport.toggleClick() : cursorAction(M32.DOWN); // cursorTrack.selectNext();
                break;

            case M32.LEFT: // Left = previous device. Left + shift = undo
                M32.isShift ? M32.application.undo() : cursorAction(M32.LEFT); // cursorDevice.selectPrevious();
                break;

            case M32.RIGHT: // Right = next device. Right + shift = redo
                M32.isShift ? M32.application.redo() : cursorAction(M32.RIGHT); // cursorDevice.selectNext();
                break;
        }
    }
} // end onMidi0 events

function onMidi1(status, data1, data2) { // onMidi1 events
    
    //println("Midi 1")
    //printMidi(status, data1, data2);
    
    if (data2 > 0) // ignore button release
    {
        switch (data1) {
            case M32.MODE: // Cycle modes
                M32.isShift ? cycleMode() : cycleSubMode();
                break;
        }
    }
} // end onMidi1 events

// Cursor functions accroding to controller mode
function cursorAction(cursorButton) {
    // ARRANGER mode
    if (M32.modeName[M32.isMode] == ARRANGER) 
    {
        if (cursorButton == M32.UP) {
            return M32.cursorTrack.selectPrevious();
        }
        if (cursorButton == M32.DOWN) {
            return M32.cursorTrack.selectNext();
        }
        if (cursorButton == M32.LEFT) {
            return M32.cursorDevice.selectPrevious();
        }
        if (cursorButton == M32.RIGHT) {
            return M32.cursorDevice.selectNext();
        }
    }
    // MIXER mode
    if (M32.modeName[M32.isMode] == MIXER) 
    {
        if (cursorButton == M32.UP) {
            return M32.application.focusPanelAbove();
        }
        if (cursorButton == M32.DOWN) {
            return M32.application.focusPanelBelow();
        }
        if (cursorButton == M32.LEFT) {
            if (M32.modeName[M32.isMode][M32.isSubMode] == "DEVICE") {
                return M32.cursorDevice.selectPrevious();
            } else {
                return M32.cursorTrack.selectPrevious();
                setTrackSelected(M32.selectedTrack);
            }
        }
        if (cursorButton == M32.RIGHT) {
            if (M32.modeName[M32.isMode][M32.isSubMode] == "DEVICE") {
                return M32.cursorDevice.selectNext();
            } else {
                return M32.cursorTrack.selectNext();
                setTrackSelected(M32.selectedTrack);
            }
        }
    }
}

// Cycle through controller modes and display onscreen
function cycleMode() {
    if (M32.isMode < (M32.modeName.length - 1)) {
        M32.isMode++;
    } else {
        M32.isMode = 0;
    }
    M32.isSubMode = 1; // Reset isSubMode
    // Change panel layout
    if (M32.modeName[M32.isMode] == MIXER) {
        M32.application.setPanelLayout("MIX");
    }
    if (M32.modeName[M32.isMode] == ARRANGER) {
        M32.application.setPanelLayout("ARRANGE");
    }
    host.showPopupNotification("Controller mode: " + M32.modeName[M32.isMode][0]);
}

// Cycle through subModes and display onscreen
function cycleSubMode() {
    if (M32.isSubMode < (M32.modeName[M32.isMode].length - 1)) {
    M32.isSubMode++;
    } else {
    M32.isSubMode = 1;
    }
    host.showPopupNotification(M32.modeName[M32.isMode][0] + " sub-mode: " + M32.modeName[M32.isMode][M32.isSubMode]);
}

function exit() {}
