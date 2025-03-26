const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: {
        pixelArt: false, 
        antialias: true,
        roundPixels: true
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 }, 
            debug: false 
        }
    },
    scene: { preload, create, update }
};

let game, player, cursors, spaceKey, obstacles, background, rings;
let score = 0;
let ringCount = 0;
let scoreText, ringCountText;
let speed = -150;
let speedMultiplier = 1;
let gameOverFlag = false;
let gameStarted = false;
let leaderboard = [];
let userWallet = '';

function preload() {
    this.load.image('background', 'assets/background.png');
    this.load.image('player', 'assets/player.png'); 
    this.load.image('obstacle', 'assets/obstacle.png');
    this.load.image('ground', 'assets/ground.png');
    this.load.image('ring', 'assets/ring.png');
}

document.getElementById("startGame").addEventListener("click", () => {
    if (!gameStarted) {
        document.getElementById("startGame").style.display = "none";
        setTimeout(() => {
            game = new Phaser.Game(config);
            gameStarted = true;
        }, 3000);
    }
});

document.getElementById("restartGame").addEventListener("click", () => {
    if (game) {
        game.destroy(true);
    }
    document.getElementById("restartGame").style.display = "none";
    score = 0;
    ringCount = 0;
    speed = -150;
    speedMultiplier = 1;
    gameOverFlag = false;
    gameStarted = false;
    game = new Phaser.Game(config);
});

function create() {
    background = this.add.tileSprite(0, 0, window.innerWidth, window.innerHeight, 'background')
        .setOrigin(0, 0)
        .setScrollFactor(0);

    let ground = this.physics.add.staticImage(
        window.innerWidth / 2,
        window.innerHeight - 40,
        'ground'
    ).setOrigin(0.5, 0.5);

    ground.displayWidth = window.innerWidth;
    ground.displayHeight = 80;
    ground.refreshBody();

    player = this.physics.add.sprite(100, window.innerHeight - 150, 'player')
        .setScale(0.5);
    
    player.setBounce(0.2);
    player.setCollideWorldBounds(true);
    player.body.setGravityY(800);

    this.physics.add.collider(player, ground);

    cursors = this.input.keyboard.createCursorKeys();
    spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    obstacles = this.physics.add.group();
    this.physics.add.overlap(player, obstacles, gameOver, null, this);

    rings = this.physics.add.group();
    this.physics.add.overlap(player, rings, collectRing, null, this);

    this.time.addEvent({
        delay: 2000,
        callback: spawnObstacle,
        callbackScope: this,
        loop: true
    });

    this.time.addEvent({
        delay: 3000,
        callback: spawnRing,
        callbackScope: this,
        loop: true
    });

    this.canDoubleJump = true;

    scoreText = this.add.text(16, 16, 'Score: 0', { 
        fontSize: '32px', 
        fill: '#FFF' 
    });

    ringCountText = this.add.text(16, 56, 'Rings: 0', { 
        fontSize: '32px', 
        fill: '#FFF' 
    });
}

function update() {
    if (!gameStarted || gameOverFlag) return;

    background.tilePositionX += 2;

    if ((cursors.up.isDown || spaceKey.isDown)) {
        if (player.body.blocked.down) {
            player.setVelocityY(-700);
            this.canDoubleJump = true;
        } 
        else if (this.canDoubleJump && player.body.velocity.y > 0) {
            player.setVelocityY(-500);
            this.canDoubleJump = false;
        }
    }
}

function spawnObstacle() {
    if (!gameStarted || gameOverFlag) return;
    let obstacle = obstacles.create(window.innerWidth + 100, window.innerHeight - 100, 'obstacle')
        .setScale(0.5);

    obstacle.setVelocityX(speed);
    obstacle.body.allowGravity = false;
    obstacle.setCollideWorldBounds(false);
    
    this.time.delayedCall(10000, () => {
        if (obstacle.active) {
            obstacle.destroy();
        }
    });
}

function spawnRing() {
    if (!gameStarted || gameOverFlag) return;

    let minY = window.innerHeight - 350;
    let maxY = window.innerHeight - 150;

    let randomY = Phaser.Math.Between(minY, maxY);
    
    let ring = rings.create(
        window.innerWidth + 100, 
        randomY, 
        'ring'
    ).setScale(0.4);

    ring.setVelocityX(speed);
    ring.body.allowGravity = false;
    ring.setCollideWorldBounds(false);
    
    this.time.delayedCall(10000, () => {
        if (ring.active) {
            ring.destroy();
        }
    });
}

function collectRing(player, ring) {
    ring.disableBody(true, true);
    
    ringCount++;
    ringCountText.setText('Rings: ' + ringCount);

    score += 100;
    scoreText.setText('Score: ' + score);

    if (score % 300 === 0) {
        speedMultiplier *= 1.5;
        speed = Math.floor(speed * 1.5);
        
        obstacles.getChildren().forEach((obstacle) => {
            obstacle.setVelocityX(speed);
        });

        rings.getChildren().forEach((ring) => {
            ring.setVelocityX(speed);
        });
    }
}

function gameOver(player, obstacle) {
    if (gameOverFlag) return;

    gameOverFlag = true;
    player.setVelocityX(0);
    player.setTint(0xff0000);
    this.physics.pause();
    
    if (typeof saveScore === 'function') {
        saveScore();
    }

    document.getElementById("restartGame").style.display = "block";

    this.add.text(
        window.innerWidth / 2, 
        window.innerHeight / 2-100, 
        'Game Over', 
        { 
            fontSize: '64px', 
            fill: '#ff0000',
            fontStyle: 'bold'
        }
    ).setOrigin(0.5);

    this.add.text(
        window.innerWidth / 2, 
        window.innerHeight / 2 + 100, 
        `Speed Multiplier: ${speedMultiplier.toFixed(2)}x`, 
        { 
            fontSize: '32px', 
            fill: '#FFFFFF'
        }
    ).setOrigin(0.5);
}

function saveScore() {
    if (score > 0) {
        let scoreEntry = {
            score: score,
            rings: ringCount,
            speedMultiplier: speedMultiplier
        };
        
        leaderboard.push(scoreEntry);
        leaderboard.sort((a, b) => b.score - a.score);
        leaderboard = leaderboard.slice(0, 10);
        
        localStorage.setItem('gameScores', JSON.stringify(leaderboard));
    }
}