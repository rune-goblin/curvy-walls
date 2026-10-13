import { CurvyWallsToolBar } from './CurvyWallsToolBar.mjs';
import { CurvyWallToolManager, Mode } from './CurvyWallToolManager.mjs';
import SETTINGS from "../common/Settings.mjs";
import { BezierTool, ToolMode } from './tools/BezierTool.mjs';

const curvyWallApp = new CurvyWallsToolBar();

Hooks.once('init', function () {
	SETTINGS.register(CurvyWallsToolBar.PREF_POSITION, {
		scope: 'client',
		type: Object,
		config: false,
		default: null,
	});
	SETTINGS.register(CurvyWallsToolBar.PREF_OPEN, {
		scope: 'client',
		type: Boolean,
		config: false,
		default: true,
	});
	SETTINGS.register(CurvyWallsToolBar.PREF_PRESERVE, {
		scope: 'world',
		type: Boolean,
		config: true,
		default: true,
		name: 'df-curvy-walls.SettingPreserve_Name',
		hint: 'df-curvy-walls.SettingPreserve_Hint',
	});
	SETTINGS.register(CurvyWallToolManager.PREF_DROP_KEY, {
		name: 'df-curvy-walls.SettingDropKey_Name',
		hint: 'df-curvy-walls.SettingDropKey_Hint',
		config: true,
		scope: 'world',
		choices: {
			alt: 'df-curvy-walls.SettingDropKey_OptionAlt',
			ctrl: 'df-curvy-walls.SettingDropKey_OptionCtrl'
		},
		default: 'alt',
		type: String
	});
	SETTINGS.register(BezierTool.PREF_SMALL_HANDLES, {
		name: 'df-curvy-walls.SettingSmallHandlesName',
		hint: 'df-curvy-walls.SettingSmallHandlesHint',
		config: true,
		scope: 'world',
		type: Boolean,
		default: false,
	});

	game.keybindings.register(SETTINGS.MOD_NAME, 'applyTool', {
		name: 'df-curvy-walls.apply',
		editable: [{ key: "Enter" }],
		onDown: () => { CurvyWallToolManager.instance.apply(); }
	});
	game.keybindings.register(SETTINGS.MOD_NAME, 'cancelTool', {
		name: 'df-curvy-walls.cancel',
		editable: [{ key: 'Delete' }],
		onDown: () => CurvyWallToolManager.instance.clearTool()
	});
	// Escape cancels the placed tool; when no tool is placed we let the event
	// continue so Foundry's default Escape handling (main menu) still works.
	game.keybindings.register(SETTINGS.MOD_NAME, 'cancelToolEscape', {
		name: 'df-curvy-walls.cancel',
		editable: [{ key: 'Escape' }],
		precedence: CONST.KEYBINDING_PRECEDENCE.PRIORITY,
		onDown: () => {
			const mgr = CurvyWallToolManager.instance;
			if (mgr.mode === Mode.None || !mgr.activeTool || mgr.activeTool.mode === ToolMode.NotPlaced) return false;
			mgr.clearTool();
			return true;
		}
	});
	game.keybindings.register(SETTINGS.MOD_NAME, 'incrementSegments', {
		name: 'df-curvy-walls.increment',
		editable: [{ key: 'Equal' }],
		repeat: true,
		onDown: () => { CurvyWallToolManager.instance.segments++; }
	});
	game.keybindings.register(SETTINGS.MOD_NAME, 'decrementSegments', {
		name: 'df-curvy-walls.decrement',
		editable: [{ key: 'Minus' }],
		repeat: true,
		onDown: () => { CurvyWallToolManager.instance.segments--; }
	});

	CurvyWallToolManager.instance.init();
});

Hooks.once("ready", function () {
	// Exit if we do not have a canvas
	if (game.settings.get('core', 'noCanvas')) return;
	if (!game.modules.get('lib-wrapper')?.active) {
		console.error('Missing libWrapper module dependency');
		if (game.user.isGM)
			ui.notifications.error(game.i18n.localize('df-curvy-walls.errorLibWrapperMissing'));
		return;
	}
	// @ts-ignore
	canvas.walls.bezier = CurvyWallToolManager.instance;
	CurvyWallToolManager.instance.patchWallsLayer();

	Hooks.on('renderSceneControls', syncToolBar);
	syncToolBar(ui.controls);
});

Hooks.on('getSceneControlButtons', (/**@type {Record<string, SceneControl>}*/controls) => {
	const tools = controls.walls?.tools;
	if (!tools) return;
	tools[CurvyWallsToolBar.SCENE_TOOL] = {
		name: CurvyWallsToolBar.SCENE_TOOL,
		title: 'df-curvy-walls.toolbar',
		icon: 'fa-solid fa-bezier-curve',
		toggle: true,
		active: SETTINGS.get(CurvyWallsToolBar.PREF_OPEN),
		order: (tools.snap?.order ?? Object.keys(tools).length) + 0.5,
		onChange: (_event, active) => {
			SETTINGS.set(CurvyWallsToolBar.PREF_OPEN, active);
			syncToolBar(ui.controls);
		}
	};
});

/**@param {SceneControls} controls*/
function syncToolBar(controls) {
	if (!game.user.isGM) return;
	if (controls.control?.name !== 'walls') {
		curvyWallApp.close();
		return;
	}
	if (controls.tools[CurvyWallsToolBar.SCENE_TOOL]?.active === false) {
		// A selected shape keeps every walls-layer drag, and the closed toolbar has no button to deselect it.
		curvyWallApp.close(false);
		return;
	}
	curvyWallApp.render();
	if (CurvyWallToolManager.instance.mode != Mode.None)
		CurvyWallToolManager.instance.render();
}
