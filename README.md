# Input Lock

Top-bar padlock that locks all input. Click it to lock: keyboard, mouse and touchpad clicks, scrolling, gestures, touch, and pointer movement are all blocked (the cursor freezes in place). The icon turns red while locked.

Press **Super+Backspace** to unlock. That's the only way out.

GNOME Shell extension (48–51).

## Install

```sh
git clone https://github.com/voidrlm/gnome-input-lock.git ~/.local/share/gnome-shell/extensions/input-lock@arjun
gnome-extensions enable input-lock@arjun
```

Log out and back in (Wayland) for GNOME to discover it.

## Emergency escape

If Super+Backspace doesn't work on your keyboard, switch to a text console (Ctrl+Alt+F3), log in, run `gnome-extensions disable input-lock@arjun`, then switch back (Ctrl+Alt+F2 or F1).
