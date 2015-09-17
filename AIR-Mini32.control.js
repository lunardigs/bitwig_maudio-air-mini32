/*
Bitwig 1.x.x controller script for M-Audio Axiom A.I.R. Mini32
latest version: https://github.com/lunardigs/bitwig_maudio-air-mini32
version 2.0-beta
*/

/* Todo:
Ctl + 0 equiv for narrowing view
Create trackBank for MIXER mode knobs
Enumerate real effects sends for submode selection
Create relative adjustment of tempo as opposed to fixed
Represent proper volume in dB (-48 dB to 0 dB)
Add features to TRACK.CURSOR mode
Add pre-roll and rec-quant functions to KNOB_5 & 6
See if it's possible to change the MODE button midi port
*/

loadAPI(1);

host.defineController("MAudio", "Mini32", "2.0-beta", "B2E17CB0-516B-11E4-916C-0800200C9A66");
host.defineMidiPorts(2, 2); // Mini32 MIDI ports
host.addDeviceNameBasedDiscoveryPair(["Axiom A.I.R. Mini32"], ["Axiom A.I.R. Mini32"]);

// M32 prefix for CC buttons, modes, etc.
var M32 = {
  MODE: 58, // MODE button
  isMode: 0,
  isSubMode: 1,
  isPreroll: 0,
  modeName: [TRACK = ["TRACK", "CURSOR", "DEVICE"], MIXER = ["MIXER", "VOLUME", "PAN", "SEND 1", "SEND 2", "DEVICE"]], // Modes and respective subModes nested array
  UP: 19,
  DOWN: 20,
  SHIFT: 23, // SHIFT button
  isShift: false,
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
  LOWEST_CC: 1,
  HIGHEST_CC: 119
};

// Initialize
function init() {
  // MIDI ports
  host.getMidiInPort(0).setMidiCallback(onMidiPort1);
  host.getMidiInPort(1).setMidiCallback(onMidiPort2);
  generic = host.getMidiInPort(0).createNoteInput("MIDI Keyboard", "??????");
  generic.setShouldConsumeEvents(false);

  /*
  Send init SysEx
  WARNING: UPON LOADING THIS SCRIPT, THE FOLLOWING LINE WILL OVERWRITE MEMORY SLOT 0 (ZERO) ON YOUR MINI32. No other memory slots will be affected. The reason for initalizing slot 0 is because the Mini32's default knob-CC assignments (CC 1-8) overlaps standard MIDI funtions that will interfere with recodings.
  */
  host.getMidiOutPort(0).sendSysex("f0 00 01 05 20 7f 7f 00 00 00 01 00 10 00 10 00 00 00 00 00 00 00 09 00 00 00 00 00 40 00 00 00 7f 00 00 01 04 00 00 00 7f 00 40 00 01 00 00 00 7f 00 40 00 18 00 00 00 7f 00 19 00 00 00 7f 00 1a 00 00 00 7f 00 1b 00 00 00 7f 00 1c 00 00 00 7f 00 1d 00 00 00 7f 00 1e 00 00 00 7f 00 1f 00 00 00 7f 00 10 00 00 00 7f 00 11 00 00 00 7f 00 12 00 00 00 7f 00 13 00 00 00 7f 00 14 00 00 00 7f 00 15 00 00 00 7f 00 16 00 00 00 7f 00 17 00 00 00 7f 00 24 00 25 00 26 00 27 00 28 00 29 00 2a 00 2b 00 2c 00 2d 00 2e 00 2f 00 30 00 31 00 32 00 33 00 00 00 00 00 00 f7");

  // Create host objects
  application = host.createApplication();
  transport = host.createTransport();
  masterTrack_0 = host.createMasterTrack(0);
  cursorTrack = host.createCursorTrackSection(4, 5);
  trackBank = host.createTrackBankSection(8, 4, 0);
  cursorDevice = host.createCursorDeviceSection(8);
  userControls = host.createUserControlsSection(M32.HIGHEST_CC - M32.LOWEST_CC + 1 - 8);

  // Map CC 1 - 8 to device parameters
  primaryInstrument = cursorTrack.getPrimaryInstrument();

  for (var i = 0; i < 8; i++) {
    var p = primaryInstrument.getMacro(i).getAmount();
    p.setIndication(true);
  }

  // Populate trackBank
  for (var p = 0; p < 8; p++) {
    var macro = primaryInstrument.getMacro(p).getAmount();
    var parameter = cursorDevice.getParameter(p);
    var track = trackBank.getTrack(p);
    macro.setIndication(true);
    parameter.setIndication(true);
    parameter.setLabel("P" + (p + 1));
    track.getVolume().setIndication(true);
    track.getPan().setIndication(true);
    track.getSend(0).setIndication(true);
    track.getSend(1).setIndication(true);
  }
}

// CC range functions
function isInDeviceParametersRange(cc) {
  return cc >= M32.KNOB_START_CC && cc <= M32.KNOB_END_CC;
}

// Actions for CC events arriving on MIDI port 1
function onMidiPort1(status, data1, data2) {
  /*
  Macro knob mode for selected device
  */
  var index = data1;
  if (M32.modeName[M32.isMode][M32.isSubMode] == "DEVICE") {
    if (isChannelController(status)) {
      if (isInDeviceParametersRange(data1)) {
        var index = data1 - M32.KNOB_START_CC;
        cursorDevice.getMacro(index).getAmount().set(data2, 128);
      } else if (data1 >= M32.LOWEST_CC && data1 <= M32.HIGHEST_CC) {
        var index = data1 - M32.LOWEST_CC;
        userControls.getControl(index).set(data2, 128);
      }
    }
  }
  /*
  TRACK mode knobs for selected track
  */
  if (M32.modeName[M32.isMode] == TRACK && M32.modeName[M32.isMode][M32.isSubMode] == "CURSOR") {
    if (data2 > 0) // ignore button release
    {
      switch (data1) {
        case M32.KNOB_1: // Volume selected track
          cursorTrack.getVolume().set(data2, 128);
          break;

        case M32.KNOB_2: // Pan selected track
          cursorTrack.getPan().set(data2, 128);
          break;

        case M32.KNOB_3: // Send 1 selected track
          cursorTrack.getSend(0).set(data2, 128);
          break;

        case M32.KNOB_4: // Send 2 selected track
          cursorTrack.getSend(1).set(data2, 128);
          break;

        case M32.KNOB_5:
          // TBD
          break;

        case M32.KNOB_6:
          // TBD
          break;

        case M32.KNOB_7: // Adjust click volume
          transport.setMetronomeValue(data2, 128);
          metroVolume = Math.round((data2 / 127) * 100);
          host.showPopupNotification("Click Volume: " + metroVolume + " %");
          break;

        case M32.KNOB_8: // Adjust tempo. + shift Master Vol.
          M32.isShift ? masterTrack_0.getVolume().set(data2, 128) : transport.getTempo().setRaw(data2 + 49);
          break;
      }
    }
  }
  /*
  MIXER mode knobs for selected track
  */
  // Volume controls
  if (M32.modeName[M32.isMode] == MIXER && M32.modeName[M32.isMode][M32.isSubMode] == "VOLUME") {
    if (isChannelController(status)) {
      if (isInDeviceParametersRange(data1) && M32.isShift == false) { // Volume control for first 8 exiting tracks
        var index = data1 - M32.KNOB_START_CC;
        trackBank.getTrack(index).getVolume().set(data2, 128);
      } else if (data1 >= M32.LOWEST_CC && data1 <= M32.HIGHEST_CC) {
        var index = data1 - M32.LOWEST_CC;
        userControls.getControl(index).set(data2, 128);
      }
    }
  }
  // Pan controls
  if (M32.modeName[M32.isMode] == MIXER && M32.modeName[M32.isMode][M32.isSubMode] == "PAN") {
    if (isChannelController(status)) {
      if (isInDeviceParametersRange(data1)) {
        var index = data1 - M32.KNOB_START_CC;
        trackBank.getTrack(index).getPan().set(data2, 128);
      } else if (data1 >= M32.LOWEST_CC && data1 <= M32.HIGHEST_CC) {
        var index = data1 - M32.LOWEST_CC;
        userControls.getControl(index).set(data2, 128);
      }
    }
  }
  // Send 1 controls
  if (M32.modeName[M32.isMode] == MIXER && M32.modeName[M32.isMode][M32.isSubMode] == "SEND 1") {
    if (isChannelController(status)) {
      if (isInDeviceParametersRange(data1)) {
        var index = data1 - M32.KNOB_START_CC;
        trackBank.getTrack(index).getSend(0).set(data2, 128);
      } else if (data1 >= M32.LOWEST_CC && data1 <= M32.HIGHEST_CC) {
        var index = data1 - M32.LOWEST_CC;
        userControls.getControl(index).set(data2, 128);
      }
    }
  }
  // Send 2 controls
  if (M32.modeName[M32.isMode] == MIXER && M32.modeName[M32.isMode][M32.isSubMode] == "SEND 2") {
    if (isChannelController(status)) {
      if (isInDeviceParametersRange(data1)) {
        var index = data1 - M32.KNOB_START_CC;
        trackBank.getTrack(index).getSend(1).set(data2, 128);
      } else if (data1 >= M32.LOWEST_CC && data1 <= M32.HIGHEST_CC) {
        var index = data1 - M32.LOWEST_CC;
        userControls.getControl(index).set(data2, 128);
      }
    }
  }
  /*
  Transport and cursor for tracks (up, down) and devices (left, right)
	*/
  if (data2 > 0) // ignore button release
  {
    switch (data1) {
      case M32.PLAY: // Play = play. Play + shift = solo selected track
        M32.isShift ? cursorTrack.getSolo().toggle() : transport.play();
        break;

      case M32.STOP: // Stop = Stop. Stop + shift = mute selected track
        M32.isShift ? cursorTrack.getMute().toggle() : transport.stop();
        break;

      case M32.REC: // Rec = Record. Rec + shift = arm selected track
        M32.isShift ? cursorTrack.getArm().toggle() : transport.record();
        break;

      case M32.UP: // Up = previous track. Up + shift = metronome toggle
        M32.isShift ? transport.toggleOverdub() : cursorAction(M32.UP); // cursorTrack.selectPrevious();
        break;

      case M32.DOWN: // Down = next track
        M32.isShift ? transport.toggleClick() : cursorAction(M32.DOWN); // cursorTrack.selectNext();
        break;

      case M32.LEFT: // Left = previous device. Left + shift = undo
        M32.isShift ? application.undo() : cursorAction(M32.LEFT); // cursorDevice.selectPrevious();
        break;

      case M32.RIGHT: // Right = next device. Right + shift = redo
        M32.isShift ? application.redo() : cursorAction(M32.RIGHT); // cursorDevice.selectNext();
        break;

      case M32.KNOB_8: //
        if (M32.isShift == true) {
          masterTrack_0.getVolume().set(data2, 128);
        }
        break;
    }
  }
  // Shift button
  switch (data1) {
    case M32.SHIFT:
      M32.isShift = data2 > 0;
      break;
  }
}

// Actions for CC events arriving on MIDI port 2
function onMidiPort2(status, data1, data2) {
  if (data2 > 0) // ignore button release
  {
    switch (data1) {
      case M32.MODE: // Cycle modes
        M32.isShift ? cycleMode() : cycleSubMode();
        break;
    }
  }
}

// Cursor functions accroding to controller mode
function cursorAction(cursorButton) {
  // TRACK
  if (M32.modeName[M32.isMode] == TRACK) {
    if (cursorButton == M32.UP) {
      return application.arrowKeyUp();
    }
    if (cursorButton == M32.DOWN) {
      return application.arrowKeyDown();
    }
    if (cursorButton == M32.LEFT) {
      return cursorDevice.selectPrevious();
    }
    if (cursorButton == M32.RIGHT) {
      return cursorDevice.selectNext();
    }
  }
  // MIXER
  if (M32.modeName[M32.isMode] == MIXER) {
    if (cursorButton == M32.UP) {
      return application.focusPanelAbove();
    }
    if (cursorButton == M32.DOWN) {
      return application.focusPanelBelow();
    }
    if (cursorButton == M32.LEFT) {
      return application.arrowKeyLeft()
    }
    if (cursorButton == M32.RIGHT) {
      return application.arrowKeyRight();
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
    application.setPanelLayout("MIX");
  }
  if (M32.modeName[M32.isMode] == TRACK) {
    application.setPanelLayout("ARRANGE");
  }
  host.showPopupNotification("Controller mode: " + M32.modeName[M32.isMode][0]);
  println(M32.isPanelLayout);
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
