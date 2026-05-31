/**
 * audio_unlock.js — iOS / Safari Web Audio API unlock
 *
 * Safari suspends the AudioContext until a user gesture has occurred.
 * This script resumes it on the first touch/click so Godot's audio
 * works immediately after the player taps the screen.
 *
 * Must be loaded AFTER index.js so the Godot engine is already set up.
 */
(function () {
	'use strict';

	var unlocked = false;

	function unlock() {
		if (unlocked) return;
		unlocked = true;

		// 1. Resume any AudioContext that Godot or the browser already created.
		//    Godot 4 Web stores its context on the AudioContext global chain.
		var contexts = [];

		// Collect all known AudioContext instances
		if (window.GodotAudio && window.GodotAudio.ctx) {
			contexts.push(window.GodotAudio.ctx);
		}

		// 2. Create a silent one-shot buffer — this is the canonical iOS unlock trick.
		//    Safari requires an actual buffer playback inside the gesture handler.
		try {
			var AC = window.AudioContext || window.webkitAudioContext;
			if (AC) {
				var ctx = new AC();
				contexts.push(ctx);
				var buf = ctx.createBuffer(1, 1, 22050);
				var src = ctx.createBufferSource();
				src.buffer = buf;
				src.connect(ctx.destination);
				if (src.start) {
					src.start(0);
				} else {
					src.noteOn(0); // legacy Safari
				}
			}
		} catch (e) {
			// Ignore — best effort
		}

		// 3. Resume all collected contexts
		contexts.forEach(function (ctx) {
			if (ctx && ctx.state === 'suspended' && ctx.resume) {
				ctx.resume();
			}
		});

		// 4. Remove listeners — only needed once
		['touchstart', 'touchend', 'click', 'keydown'].forEach(function (evt) {
			document.removeEventListener(evt, unlock, true);
		});
	}

	// Attach to all gesture events that Safari accepts
	['touchstart', 'touchend', 'click', 'keydown'].forEach(function (evt) {
		document.addEventListener(evt, unlock, true);
	});
}());
