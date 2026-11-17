import Clutter from 'gi://Clutter';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

const ICON_UNLOCKED = 'changes-allow-symbolic';
const ICON_LOCKED = 'changes-prevent-symbolic';
const SUPER = Clutter.ModifierType.MOD4_MASK | Clutter.ModifierType.SUPER_MASK;

export default class InputLockExtension extends Extension {
    enable() {
        this._grab = null;
        this._barriers = [];
        this._frozenAt = null;

        this._icon = new St.Icon({
            icon_name: ICON_UNLOCKED,
            style_class: 'system-status-icon',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._button = new PanelMenu.Button(0.5, this.metadata.name, true);
        this._button.add_style_class_name('input-lock-panel');
        this._button.add_child(this._icon);
        this._button.connect('button-press-event', (_a, event) => {
            if (event.get_button() === Clutter.BUTTON_PRIMARY)
                this._lock();
            return Clutter.EVENT_STOP;
        });
        this._button.connect('touch-event', (_a, event) => {
            if (event.type() === Clutter.EventType.TOUCH_BEGIN)
                this._lock();
            return Clutter.EVENT_STOP;
        });
        Main.panel.addToStatusArea(this.uuid, this._button, 0, 'right');

        // Transparent full-screen layer that holds the modal grab and eats every event.
        this._overlay = new St.Widget({reactive: true, visible: false});
        this._overlay.add_constraint(new Clutter.BindConstraint({
            source: global.stage, coordinate: Clutter.BindCoordinate.ALL,
        }));
        this._overlay.connect('captured-event', (_a, event) => this._filter(event));
        Main.layoutManager.uiGroup.add_child(this._overlay);
    }

    disable() {
        this._unlock();
        this._overlay.destroy();
        this._overlay = null;
        this._button.destroy();
        this._button = null;
        this._icon = null;
    }

    _lock() {
        if (this._grab)
            return;
        this._overlay.show();
        this._overlay.get_parent().set_child_above_sibling(this._overlay, null);
        this._grab = Main.pushModal(this._overlay, {actionMode: Shell.ActionMode.NONE});
        global.stage.set_key_focus(this._overlay);
        this._freezePointer();
        this._icon.icon_name = ICON_LOCKED;
        this._button.add_style_class_name('input-lock-on');
    }

    _unlock() {
        if (!this._grab)
            return;
        Main.popModal(this._grab);
        this._grab = null;
        this._unfreezePointer();
        this._overlay.hide();
        this._icon.icon_name = ICON_UNLOCKED;
        this._button.remove_style_class_name('input-lock-on');
    }

    // Box the cursor in with four one-way pointer barriers that only let it move inward.
    _freezePointer() {
        const [x, y] = global.get_pointer();
        this._frozenAt = [x, y];
        const D = Meta.BarrierDirection;
        const walls = [
            [x - 1, y - 2, x - 1, y + 3, D.POSITIVE_X],   // left
            [x + 1, y - 2, x + 1, y + 3, D.NEGATIVE_X],   // right
            [x - 2, y - 1, x + 3, y - 1, D.POSITIVE_Y],   // top
            [x - 2, y + 1, x + 3, y + 1, D.NEGATIVE_Y],   // bottom
        ];
        for (const [x1, y1, x2, y2, directions] of walls) {
            try {
                this._barriers.push(new Meta.Barrier({backend: global.backend, x1, y1, x2, y2, directions}));
            } catch (e) {
                console.warn(`input-lock: barrier failed: ${e.message}`);
            }
        }
    }

    _unfreezePointer() {
        this._barriers.forEach(b => b.destroy());
        this._barriers = [];
        this._frozenAt = null;
    }

    _filter(event) {
        const type = event.type();
        if (type === Clutter.EventType.MOTION && this._frozenAt) {
            // Fallback for anything that slips past the barriers (e.g. absolute devices).
            const [x, y] = global.get_pointer();
            const [fx, fy] = this._frozenAt;
            if (x !== fx || y !== fy)
                global.stage.get_context().get_backend().get_default_seat().warp_pointer(fx, fy);
        }

        if (type === Clutter.EventType.KEY_PRESS &&
            event.get_key_symbol() === Clutter.KEY_BackSpace &&
            (event.get_state() & SUPER)) {
            this._unlock();
        }
        return Clutter.EVENT_STOP;   // keys, clicks, movement, scroll, gestures, touch...
    }
}
