/// <reference path="./types.d.ts" />
import { CurvyWallToolManager, Mode } from './CurvyWallToolManager.mjs';
import SETTINGS from "../common/Settings.mjs";
import { ToolMode } from './tools/BezierTool.mjs';

const DEFAULT_POSITION = { left: 110, top: 73 };

/**
 * @param {string} title
 * @param {string} icon
 * @param {Mode} mode
 * @returns {CurvyWallControl}
 */
function modeToggle(title, icon, mode) {
	return {
		title,
		icon,
		toggleable: true,
		isActive: () => CurvyWallToolManager.instance.mode == mode,
		onClick: enabled => { CurvyWallToolManager.instance.mode = enabled ? mode : Mode.None; }
	};
}

export class CurvyWallsToolBar {
	/** @readonly */static PREF_PRESERVE = 'preserve-tool';
	/** @readonly */static PREF_POSITION = 'toolbar-pos';
	/** @readonly */static PREF_OPEN = 'toolbar-open';
	/** @readonly */static SCENE_TOOL = 'curvywalls';

	/**@type {Record<string, CurvyWallControl>}*/#_tools = {
		beziercube: modeToggle('df-curvy-walls.cubic', 'fas fa-bezier-curve', Mode.Cube),
		bezierquad: modeToggle('df-curvy-walls.quadratic', 'fas fa-project-diagram', Mode.Quad),
		beziercirc: modeToggle('df-curvy-walls.circle', 'fas fa-circle', Mode.Circ),
		bezierrect: modeToggle('df-curvy-walls.rectangle', 'fas fa-vector-square', Mode.Rect)
	};
	/**@type {Record<string, CurvyWallControl>}*/
	#_generalControls = {
		increment: {
			title: 'df-curvy-walls.increment',
			icon: 'fas fa-plus',
			onClick: () => CurvyWallToolManager.instance.segments++
		},
		decrement: {
			title: 'df-curvy-walls.decrement',
			icon: 'fas fa-minus',
			onClick: () => CurvyWallToolManager.instance.segments--
		},
		apply: {
			title: 'df-curvy-walls.apply',
			icon: 'fas fa-check',
			class: 'apply',
			onClick: CurvyWallToolManager.instance.apply.bind(CurvyWallToolManager.instance)
		},
		cancel: {
			title: 'df-curvy-walls.cancel',
			icon: 'fas fa-times',
			class: 'cancel',
			onClick: CurvyWallToolManager.instance.clearTool.bind(CurvyWallToolManager.instance)
		}
	};
	/**@type {Record<string, CurvyWallControl>}*/
	#_placementControls = {
		pointconstruct: {
			title: 'df-curvy-walls.trace_curve_with_points',
			icon: 'fas fa-route',
			toggleable: true,
			isActive: () => CurvyWallToolManager.instance.currentlyMappingPoints,
			onClick: () => CurvyWallToolManager.instance.togglePointMapping()
		},
		applyplacement: {
			title: 'df-curvy-walls.pointmapapply',
			icon: 'fas fa-check',
			class: 'apply',
			onClick: () => { CurvyWallToolManager.instance.applyPointMapping(); }
		}
	};

	#_element = document.createElement('div');
	#_rail = document.createElement('div');
	#_close = document.createElement('div');
	#_grip = document.createElement('div');
	/**@type {Record<string, CurvyWallControl>}*/#_controls = {};

	constructor() {
		this.#_element.id = 'curvy-walls-toolbar';
		this.#_element.addEventListener('click', this.#_onClick.bind(this));
		this.#_grip.className = 'grip';
		this.#_grip.title = 'Drag to move (double-click to reset)';
		this.#_grip.innerHTML = '<i class="fas fa-grip-vertical"></i>';
		this.#_grip.addEventListener('mousedown', this.#_onGripDown.bind(this));
		this.#_grip.addEventListener('dblclick', this.#_resetPosition.bind(this));
		this.#_close.className = 'close';
		this.#_close.innerHTML = '<i class="fas fa-times"></i>';
		this.#_close.addEventListener('click', () => ui.controls.activate({ toggles: { [CurvyWallsToolBar.SCENE_TOOL]: false } }));
		this.#_rail.className = 'rail';
		this.#_rail.append(this.#_close, this.#_grip);
		window.addEventListener('resize', () => {
			if (this.#_element.isConnected) this.#_applyPosition();
		});
		CurvyWallToolManager.instance.setModeListener(() => {
			if (this.#_element.isConnected) this.render();
		});
	}

	render() {
		const manager = CurvyWallToolManager.instance;
		const toolIsPlaced = manager.mode != Mode.None && manager.activeTool.mode != ToolMode.NotPlaced;
		const columns = [this.#_tools];
		if (toolIsPlaced)
			columns.push(this.#_generalControls, manager.activeTool.getTools());
		else if ([Mode.Quad, Mode.Circ, Mode.Rect].includes(manager.mode)) {
			const { pointconstruct, applyplacement } = this.#_placementControls;
			columns.push(manager.currentlyMappingPoints && manager.canApplyPointMapping
				? { pointconstruct, applyplacement }
				: { pointconstruct });
		}
		this.#_controls = Object.assign({}, ...columns);
		this.#_close.title = game.i18n.localize('df-curvy-walls.toolbar_close');
		this.#_element.replaceChildren(this.#_rail, ...columns.map(column => {
			const list = document.createElement('ol');
			list.append(...Object.entries(column).map(([name, control]) => this.#_createButton(name, control)));
			return list;
		}));
		if (!this.#_element.isConnected) document.body.append(this.#_element);
		this.#_applyPosition();
	}

	/**@param {boolean} [preserveTool]*/
	close(preserveTool = SETTINGS.get(CurvyWallsToolBar.PREF_PRESERVE)) {
		this.#_element.remove();
		if (!preserveTool)
			CurvyWallToolManager.instance.mode = Mode.None;
	}

	/**
	 * @param {string} name
	 * @param {CurvyWallControl} control
	 * @returns {HTMLLIElement}
	 */
	#_createButton(name, control) {
		const button = document.createElement('li');
		button.className = 'control-tool';
		if (control.class) button.classList.add(control.class);
		if (control.toggleable) {
			button.classList.add('toggle');
			button.classList.toggle('active', !!control.isActive());
		}
		button.dataset.tool = name;
		button.title = game.i18n.localize(control.title);
		const icon = document.createElement('i');
		icon.className = control.icon;
		button.append(icon);
		return button;
	}

	/**@param {MouseEvent} event*/
	#_onClick(event) {
		const control = this.#_controls[event.target.closest('[data-tool]')?.dataset.tool];
		if (!control) return;
		if (control.toggleable) control.onClick(!control.isActive());
		else control.onClick();
		this.render();
	}

	/**@param {MouseEvent} event*/
	#_onGripDown(event) {
		if (event.button !== 0) return;
		event.preventDefault();
		const element = this.#_element;
		const start = element.getBoundingClientRect();
		const onMouseMove = (/**@type {MouseEvent}*/moveEvent) => {
			element.style.left = (start.left + moveEvent.clientX - event.clientX) + 'px';
			element.style.top = (start.top + moveEvent.clientY - event.clientY) + 'px';
		};
		const onMouseUp = () => {
			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseup', onMouseUp);
			const { left, top } = element.getBoundingClientRect();
			SETTINGS.set(CurvyWallsToolBar.PREF_POSITION, { left, top });
		};
		document.addEventListener('mousemove', onMouseMove);
		document.addEventListener('mouseup', onMouseUp);
	}

	async #_resetPosition() {
		await SETTINGS.set(CurvyWallsToolBar.PREF_POSITION, null);
		this.#_applyPosition();
	}

	#_applyPosition() {
		const { left, top } = SETTINGS.get(CurvyWallsToolBar.PREF_POSITION) ?? DEFAULT_POSITION;
		this.#_element.style.left = Math.clamp(left, 0, window.innerWidth - 50) + 'px';
		this.#_element.style.top = Math.clamp(top, 0, window.innerHeight - 50) + 'px';
	}
}
