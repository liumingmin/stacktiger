
// You can write more code here

/* START OF COMPILED CODE */

class Physics extends UserComponent {

	constructor(gameObject) {
		super(gameObject);

		this.gameObject = gameObject;
		gameObject["__Physics"] = this;

		/* START-USER-CTR-CODE */
		// Write your code here.
		/* END-USER-CTR-CODE */
	}

	/** @returns {Physics} */
	static getComponent(gameObject) {
		return gameObject["__Physics"];
	}

	/** @type {Phaser.GameObjects.Image} */
	gameObject;
	/** @type {number} */
	bodyGravity = 0;
	/** @type {boolean} */
	isStatic = false;

	/* START-USER-CODE */

	start() {

		this.gameObject.scene.physics.add.existing(this.gameObject,this.isStatic);

		/** @type {Phaser.Physics.Arcade.Body} */
		if(!this.isStatic){
			const body = this.gameObject.body;
			body.setGravityY(this.bodyGravity);
			body.setBounce(0,0);
		}
	}

	setGravityY(gravity){
		this.bodyGravity = gravity;
		if(!this.isStatic){
			const body = this.gameObject.body;
			body.setGravityY(this.bodyGravity);
		}
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
