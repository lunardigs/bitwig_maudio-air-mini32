/*
Bitwig 1.0.x controller script for M-Audio Axiom A.I.R. Mini32
latest version: https://github.com/lunardigs/bitwig_maudio-air-mini32
version 1.1
*/

loadAPI(1);

host.defineController("MAudio", "Mini32", "1.0", "B2E17CB0-516B-11E4-916C-0800200C9A66");
host.defineMidiPorts(1, 0); // Mini32 MIDI send only
host.addDeviceNameBasedDiscoveryPair(["Mini32"], ["Mini32"]);

var CC =
{
	SHIFT : 23,
	STOP : 16,
	PLAY : 17,
	REC : 18,
	PREV_TRACK : 19,
	NEXT_TRACK : 20,
	PREV_DEVICE : 22,
	NEXT_DEVICE : 21,
	LOWEST_CC : 24,
	HIGHEST_CC : 119,
	DEVICE_START_CC : 1,
	DEVICE_END_CC : 8
};

var isShift = false; // Default shift value

function init()
{
  host.getMidiInPort(0).setMidiCallback(onMidi);
  generic = host.getMidiInPort(0).createNoteInput("MIDI Keyboard", "??????");
  generic.setShouldConsumeEvents(false);

  application = host.createApplication();
  transport = host.createTransport();
  cursorTrack = host.createCursorTrackSection(2, 0);
  cursorDevice = host.createCursorDeviceSection(8);
  
	// Map CC 1 - 8 to device parameters
	primaryInstrument = cursorTrack.getPrimaryInstrument();

	for ( var i = 0; i < 8; i++)
	{
		var p = primaryInstrument.getMacro(i).getAmount();
		p.setIndication(true);
	}

	// Make the rest freely mappable
	userControls = host.createUserControlsSection(CC.HIGHEST_CC - CC.LOWEST_CC + 1 - 8);

	for ( var i = CC.LOWEST_CC; i < CC.HIGHEST_CC; i++)
	{
		if (!isInDeviceParametersRange(i))
		{
			var index = userIndexFromCC(i);
			userControls.getControl(index).setLabel("CC" + i);
		}
	}
}

// CC range functions
function isInDeviceParametersRange(cc)
{
	return cc >= CC.DEVICE_START_CC && cc <= CC.DEVICE_END_CC;
}

function userIndexFromCC(cc)
{
	if (cc > CC.DEVICE_END_CC)
	{
		return cc - CC.LOWEST_CC - 8;
	}

	return cc - CC.LOWEST_CC;
}

// CC event responses
function onMidi(status, data1, data2)
{
	// Macro knobs for selected device
	if (isChannelController(status))
	{
		if (isInDeviceParametersRange(data1))
		{
			var index = data1 - CC.DEVICE_START_CC;
			cursorDevice.getMacro(index).getAmount().set(data2, 128);
		}
		else if (data1 >= CC.LOWEST_CC && data1 <= CC.HIGHEST_CC)
		{
			var index = data1 - CC.LOWEST_CC;
			userControls.getControl(index).set(data2, 128);
		}
	}
	// Transport and cursor for tracks and devices
	if (data2 > 0) // ignore button release
	{
		switch (data1)
		{
			case CC.PLAY: // Play = play. Play + shift = solo selected track
				isShift ? cursorTrack.getSolo().toggle() : transport.play();
				break;

			case CC.STOP: // Stop = Stop. Stop + shift = mute selected track
				isShift ? cursorTrack.getMute().toggle() : transport.stop();
				break;

			case CC.REC: // Rec = Record. Rec + shift = arm selected track
				isShift ? cursorTrack.getArm().toggle() : transport.record();
				break;
				
			case CC.PREV_TRACK: // Up = previous track. Up + shift = metronome toggle
				isShift ? transport.toggleClick() : cursorTrack.selectPrevious();
				break;
				
			case CC.NEXT_TRACK: // Down = next track
				cursorTrack.selectNext();
				break;
				
			case CC.PREV_DEVICE: // Left = previous device. Left + shift = undo
				isShift ? application.undo() : cursorDevice.selectPrevious();
				break;

			case CC.NEXT_DEVICE: // Right = next device. Right + shift = redo
				isShift ? application.redo() : cursorDevice.selectNext();
				break;
		}
	}
	
	// Shift button
	switch (data1)
	{
		case CC.SHIFT:
			isShift = data2 > 0;
			break;
	}
}

function exit()
{
}
