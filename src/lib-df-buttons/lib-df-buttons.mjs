/// <reference path="./ToolType.d.ts" />

import SETTINGS from "../../common/Settings.mjs";
import ControlManagerImpl from "./ControlManager.mjs";

/**
 * Initialize the embedded lib-df-buttons toolbar system.
 * Called during the 'init' hook from the main module entry point.
 * Assumes SETTINGS.init() has already been called with the module ID.
 */
export function initButtons() {
	ui.moduleControls = new ControlManagerImpl();

	// Legacy setting — kept registered so existing worlds don't error on load
	SETTINGS.register('position', {
		scope: 'client',
		type: String,
		config: false,
		default: 'left',
	});
	SETTINGS.register('toolbar-pos', {
		scope: 'client',
		type: Object,
		config: false,
		default: null,
	});
}

/**
 * Setup the embedded lib-df-buttons toolbar system.
 * Called during the 'setup' hook from the main module entry point.
 */
export function setupButtons() {
	ui.moduleControls.initialize();
}

/**
 * Render the embedded lib-df-buttons toolbar.
 * Called during the 'ready' hook from the main module entry point.
 */
export function readyButtons() {
	ui.moduleControls.render(true);
}
