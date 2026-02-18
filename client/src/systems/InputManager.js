// ─── Input Manager ──────────────────────────────────────────
// Handles keyboard input for movement and interaction.

export default class InputManager {
    constructor(scene) {
        this.scene = scene;
        this.keys = scene.input.keyboard.addKeys({
            up: 'W',
            down: 'S',
            left: 'A',
            right: 'D',
            arrowUp: 'UP',
            arrowDown: 'DOWN',
            arrowLeft: 'LEFT',
            arrowRight: 'RIGHT',
            interact: 'E',
        });

        this.interactJustPressed = false;
        this.interactWasDown = false;
    }

    getInput() {
        let dx = 0;
        let dy = 0;

        if (this.keys.left.isDown || this.keys.arrowLeft.isDown) dx -= 1;
        if (this.keys.right.isDown || this.keys.arrowRight.isDown) dx += 1;
        if (this.keys.up.isDown || this.keys.arrowUp.isDown) dy -= 1;
        if (this.keys.down.isDown || this.keys.arrowDown.isDown) dy += 1;

        // "Just pressed" interact (one-shot)
        const interactDown = this.keys.interact.isDown;
        this.interactJustPressed = interactDown && !this.interactWasDown;
        this.interactWasDown = interactDown;

        return { dx, dy, interact: this.interactJustPressed };
    }
}
