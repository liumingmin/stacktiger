
// You can write more code here

/* START OF COMPILED CODE */

class Level extends Phaser.Scene {

	constructor() {
		super("Level");

		/* START-USER-CTR-CODE */
		// Write your code here.
		/* END-USER-CTR-CODE */
	}

	/** @returns {void} */
	editorCreate() {

		// score
		const score = this.add.text(53, 50, "", {});
		score.setOrigin(0.5, 0.5);
		score.text = "0";
		score.setStyle({ "fontFamily": "Arial", "fontSize": "30px" });

		// rectangle
		const rectangle = this.add.rectangle(580, 572, 800, 50);
		rectangle.scaleX = 1.8735486766353273;
		rectangle.scaleY = 1.303620102747287;
		rectangle.isFilled = true;
		rectangle.fillColor = 9472136;
		rectangle.strokeColor = 11573657;

		// score (components)
		new FixedToCamera(score);

		// rectangle (components)
		const rectanglePhysics = new Physics(rectangle);
		rectanglePhysics.bodyGravity = 1;
		rectanglePhysics.isStatic = true;
		new PhysicsBody(rectangle);

		this.score = score;
		this.rectangle = rectangle;

		this.events.emit("scene-awake");
	}

	/** @type {Phaser.GameObjects.Text} */
	score;
	/** @type {Phaser.GameObjects.Rectangle} */
	rectangle;

	/* START-USER-CODE */

	// Write more your code here
	tiger;
	tigers;
	success;
	create() {
		this.editorCreate();

		this.tigers =[];
		this.tiger = this.createTiger();

		this.initEnv();
		this.initWs();
	}


	initEnv() {
		this.rectangle.y = this.game.config.height;
		//this.physics.add.collider(this.tiger, this.rectangle);
	}

	initWs(){
		this.ws = null;
		this.connected = false;

		this.ws = new WebSocket("ws://"+hostAddress+":8004/join?uid="+window.localStorage["username"]);

		this.ws.onopen =  () =>{
			this.ws.binaryType = 'arraybuffer'; 
			console.log('Client has connected to the server!');
			this.connected = true;
		};
		this.ws.onerror =(error) =>{
			console.log(error);
		};


		this.ws.onmessage =(e) =>{
			let wsMessage = proto.ws.P_MESSAGE.deserializeBinary(e.data);

			switch (wsMessage.getProtocolId()) {
				case WS_S2C_SCALING:
					let scaling = proto.packet.SCALING.deserializeBinary(wsMessage.getData());
					//console.log(scaling.getScale());

					this.tiger.scene.add.tween({
						targets: [this.tiger],
						scaleX: scaling.getScale(),
						yoyo: false,
						duration: 250,
						ease: 'Linear' //'Sine.easeInOut'
					})
					break;
				case WS_S2C_DROP_TIGER:
					let stackStatus = proto.packet.STACK_STATUS.deserializeBinary(wsMessage.getData());
					this.score.text =  stackStatus.getCount()+"";
					this.success = stackStatus.getStatus();

					if(this.success==0){
						openRank();
					}
					this.dropTiger();
			}
		};
		this.ws.onclose = (e) =>{
			console.log('The client has disconnected!');
			this.connected = false;
		};
	}

	updateCam() {
		const tigerHeight = 159; //0.5*250 
		const cam = this.cameras.main;
		//console.log(this.tiger.y);
		cam.scrollY = this.tiger.y - tigerHeight/2; //this.tiger.bodyY+this.bodyHeight/2;
	}

	resumeScale(){
		let wsMessage = new proto.ws.P_MESSAGE;
		wsMessage.setProtocolId(WS_C2S_RESUME);
		let wsBin = wsMessage.serializeBinary();
		this.ws.send(wsBin);
	}

	createTiger(){
		if(this.success == 0){
			return null;
		}

		const tigerHeight = 159; //0.5*250 
		const height = this.game.config.height;
		let dropedHeight = this.tigers.length * tigerHeight;
		let newTigerHeight =  dropedHeight + height/3+ tigerHeight/2; //始终保持老虎之间有height/3高度
		let newTigerY = tigerHeight/2; // init
		if(newTigerHeight>height){
			newTigerY = height - newTigerHeight;
		}

		const tiger = this.add.image(this.game.config.width/2, newTigerY, "tiger");
		//tiger.scaleX = 0.5;
		//tiger.scaleY = 0.5;

		const phy = new Physics(tiger);
		new PhysicsBody(tiger);


		//
		const pushOnClick = new PushOnClick(tiger);

		this.physics.add.collider(tiger, this.rectangle,()=>{
			if(this.tigers.indexOf(tiger)>=0){
				return ;
			}
			Physics.getComponent(tiger).setGravityY(0);
			tiger.body.immovable = true;

			this.tigers.push(tiger);
			this.tiger = this.createTiger();
			if (this.tiger==null){
				return ;
			}
			this.resumeScale();
		});

		this.physics.add.collider(tiger, this.tigers[this.tigers.length-1],(obj1,obj2)=>{
			if(this.tigers.indexOf(tiger)>=0){
				return ;
			}
			Physics.getComponent(tiger).setGravityY(0);
			tiger.body.immovable = true;

			this.tigers.push(tiger);
			this.tiger = this.createTiger();
			if (this.tiger==null){
				return ;
			}
			this.resumeScale();
			this.updateCam()
		});

		phy.start();
		pushOnClick.awake();
		return tiger;
	}

	dropTiger(){
		Physics.getComponent(this.tiger).setGravityY(300);
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
