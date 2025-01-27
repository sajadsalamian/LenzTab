import { SetStateAction, useEffect, useState } from "react";
import Main, { HeadMeta } from "../../components/Layouts/Main/Main";
import Button from "../../components/Elements/Button";
import * as THREE from "three";
import axios from "axios";
import { Toast } from "../../components/Layouts/Main/Helper";
import { RotatingLines } from "react-loader-spinner";
import gameBack from "../../assets/images/game_back.png";
import Input from "../../components/Elements/Input";
import splash from "../../assets/images/splash.png";
import ticketBg from "../../assets/images/ticket.png";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { config } from "../../main";
import { signMessage, switchChain } from "@wagmi/core";
import { parseEther } from "viem";

export default function Game() {
  const [user, setUser]: any = useState(null);
  const [isStart, setIsStart] = useState(false);
  const [loadingGame, setLoadingGame] = useState(false);
  const [gaming, setGaming]: any = useState(null);
  const [score, setScore]: any = useState(null);
  const [showScore, setShowScore] = useState(false);
  const [showMenu, setShowMenu] = useState(true);

  const [showModal, setShowModal] = useState(false);

  const account = useAccount();
  const {
    data: hash,
    error,
    isPending,
    writeContractAsync,
  } = useWriteContract({ config });
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });
  const [tokenCount, setTokenCount] = useState(1);
  const [txHash, setTxHash] = useState("");

  useEffect(() => {
    let userInfo1 = JSON.parse(localStorage.getItem("user")!);
    let postData = {
      user_id: "" + userInfo1.user_id,
      user_name: userInfo1.user_name,
    };
    axios({
      method: "post",
      url: import.meta.env.VITE_API_URL + "/user",
      data: postData,
    })
      .then((res) => {
        console.log("Axios user fetch res", res);
        setUser(res.data);
        localStorage.setItem("user", JSON.stringify(res.data));
      })
      .catch((err) => {
        console.log("Fetch user Data Error:", err);
        if (err.response) {
          console.log("Fetch user Data Error Response:", err.response);
        }
        Toast("e", "Server Error, Please try again.");
      });
  }, []);

  useEffect(() => {
    console.log("score", score);
    if (isStart) {
      let game1 = new GameClass();
      game1.startGame();
      setGaming(game1);
    }
  }, [isStart]);

  useEffect(() => {
    console.log("score", score);
  }, [gaming]);

  interface BlockReturn {
    placed?: any;
    chopped?: any;
    plane: "x" | "y" | "z";
    direction: number;
    bonus?: boolean;
  }

  class Stage {
    private container: any;
    private camera: any;
    private scene: any;
    private renderer: any;
    private light: any;
    private softLight: any;
    private group: any;

    constructor() {
      // container

      this.container = document.getElementById("game");

      // renderer

      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
      });

      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setClearColor("#D0CBC7", 1);
      this.container.appendChild(this.renderer.domElement);

      // scene

      this.scene = new THREE.Scene();

      // camera

      let aspect = window.innerWidth / window.innerHeight;
      let d = 20;
      this.camera = new THREE.OrthographicCamera(
        -d * aspect,
        d * aspect,
        d,
        -d,
        -100,
        1000
      );
      this.camera.position.x = 2;
      this.camera.position.y = 2;
      this.camera.position.z = 2;
      this.camera.lookAt(new THREE.Vector3(0, 0, 0));

      //light

      this.light = new THREE.DirectionalLight(0xffffff, 0.5);
      this.light.position.set(0, 499, 0);
      this.scene.add(this.light);

      this.softLight = new THREE.AmbientLight(0xffffff, 0.4);
      this.scene.add(this.softLight);

      window.addEventListener("resize", () => this.onResize());
      this.onResize();
    }

    setCamera(y: number, speed: number = 0.3) {
      TweenLite.to(this.camera.position, speed, {
        y: y + 4,
        ease: Power1.easeInOut,
      });
      TweenLite.to(this.camera.lookAt, speed, { y: y, ease: Power1.easeInOut });
    }

    onResize() {
      let viewSize = 30;
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.left = window.innerWidth / -viewSize;
      this.camera.right = window.innerWidth / viewSize;
      this.camera.top = window.innerHeight / viewSize;
      this.camera.bottom = window.innerHeight / -viewSize;
      this.camera.updateProjectionMatrix();
    }

    render = function () {
      this.renderer.render(this.scene, this.camera);
    };

    add = function (elem) {
      this.scene.add(elem);
    };

    remove = function (elem) {
      this.scene.remove(elem);
    };
  }

  class Block {
    STATES = { ACTIVE: "active", STOPPED: "stopped", MISSED: "missed" };
    MOVE_AMOUNT = 12;

    dimension = { width: 0, height: 0, depth: 0 };
    position = { x: 0, y: 0, z: 0 };

    mesh: any;
    state: string;
    index: number;
    speed: number;
    direction: number;
    colorOffset: number;
    color: number;
    material: any;

    workingPlane: string;
    workingDimension: string;

    targetBlock: Block;

    constructor(block: Block) {
      // set size and position

      this.targetBlock = block;

      this.index = (this.targetBlock ? this.targetBlock.index : 0) + 1;
      this.workingPlane = this.index % 2 ? "x" : "z";
      this.workingDimension = this.index % 2 ? "width" : "depth";

      // set the dimensions from the target block, or defaults.

      this.dimension.width = this.targetBlock
        ? this.targetBlock.dimension.width
        : 10;
      this.dimension.height = this.targetBlock
        ? this.targetBlock.dimension.height
        : 2;
      this.dimension.depth = this.targetBlock
        ? this.targetBlock.dimension.depth
        : 10;

      this.position.x = this.targetBlock ? this.targetBlock.position.x : 0;
      this.position.y = this.dimension.height * this.index;
      this.position.z = this.targetBlock ? this.targetBlock.position.z : 0;

      this.colorOffset = this.targetBlock
        ? this.targetBlock.colorOffset
        : Math.round(Math.random() * 100);

      // set color
      if (!this.targetBlock) {
        this.color = 0x333344;
      } else {
        let offset = this.index + this.colorOffset;
        var r = Math.sin(0.3 * offset) * 55 + 200;
        var g = Math.sin(0.3 * offset + 2) * 55 + 200;
        var b = Math.sin(0.3 * offset + 4) * 55 + 200;
        this.color = new THREE.Color(r / 255, g / 255, b / 255);
      }

      // state

      this.state = this.index > 1 ? this.STATES.ACTIVE : this.STATES.STOPPED;

      // set direction

      this.speed = -0.1 - this.index * 0.005;
      if (this.speed < -4) this.speed = -4;
      this.direction = this.speed;

      // create block

      let geometry = new THREE.BoxGeometry(
        this.dimension.width,
        this.dimension.height,
        this.dimension.depth
      );
      geometry.applyMatrix4(
        new THREE.Matrix4().makeTranslation(
          this.dimension.width / 2,
          this.dimension.height / 2,
          this.dimension.depth / 2
        )
      );
      this.material = new THREE.MeshToonMaterial({
        color: this.color,
        shading: THREE.FlatShading,
      });
      this.mesh = new THREE.Mesh(geometry, this.material);
      this.mesh.position.set(
        this.position.x,
        this.position.y + (this.state == this.STATES.ACTIVE ? 0 : 0),
        this.position.z
      );

      if (this.state == this.STATES.ACTIVE) {
        this.position[this.workingPlane] =
          Math.random() > 0.5 ? -this.MOVE_AMOUNT : this.MOVE_AMOUNT;
      }
    }

    reverseDirection() {
      this.direction = this.direction > 0 ? this.speed : Math.abs(this.speed);
    }

    place(): BlockReturn {
      this.state = this.STATES.STOPPED;

      let overlap =
        this.targetBlock.dimension[this.workingDimension] -
        Math.abs(
          this.position[this.workingPlane] -
            this.targetBlock.position[this.workingPlane]
        );

      let blocksToReturn: BlockReturn = {
        plane: this.workingPlane,
        direction: this.direction,
      };

      if (this.dimension[this.workingDimension] - overlap < 0.3) {
        overlap = this.dimension[this.workingDimension];
        blocksToReturn.bonus = true;
        this.position.x = this.targetBlock.position.x;
        this.position.z = this.targetBlock.position.z;
        this.dimension.width = this.targetBlock.dimension.width;
        this.dimension.depth = this.targetBlock.dimension.depth;
      }

      if (overlap > 0) {
        let choppedDimensions = {
          width: this.dimension.width,
          height: this.dimension.height,
          depth: this.dimension.depth,
        };
        choppedDimensions[this.workingDimension] -= overlap;
        this.dimension[this.workingDimension] = overlap;

        let placedGeometry = new THREE.BoxGeometry(
          this.dimension.width,
          this.dimension.height,
          this.dimension.depth
        );
        placedGeometry.applyMatrix4(
          new THREE.Matrix4().makeTranslation(
            this.dimension.width / 2,
            this.dimension.height / 2,
            this.dimension.depth / 2
          )
        );
        let placedMesh = new THREE.Mesh(placedGeometry, this.material);

        let choppedGeometry = new THREE.BoxGeometry(
          choppedDimensions.width,
          choppedDimensions.height,
          choppedDimensions.depth
        );
        choppedGeometry.applyMatrix4(
          new THREE.Matrix4().makeTranslation(
            choppedDimensions.width / 2,
            choppedDimensions.height / 2,
            choppedDimensions.depth / 2
          )
        );
        let choppedMesh = new THREE.Mesh(choppedGeometry, this.material);

        let choppedPosition = {
          x: this.position.x,
          y: this.position.y,
          z: this.position.z,
        };

        if (
          this.position[this.workingPlane] <
          this.targetBlock.position[this.workingPlane]
        ) {
          this.position[this.workingPlane] =
            this.targetBlock.position[this.workingPlane];
        } else {
          choppedPosition[this.workingPlane] += overlap;
        }

        placedMesh.position.set(
          this.position.x,
          this.position.y,
          this.position.z
        );
        choppedMesh.position.set(
          choppedPosition.x,
          choppedPosition.y,
          choppedPosition.z
        );

        blocksToReturn.placed = placedMesh;
        if (!blocksToReturn.bonus) blocksToReturn.chopped = choppedMesh;
      } else {
        this.state = this.STATES.MISSED;
      }

      this.dimension[this.workingDimension] = overlap;

      return blocksToReturn;
    }

    tick() {
      if (this.state == this.STATES.ACTIVE) {
        let value = this.position[this.workingPlane];
        if (value > this.MOVE_AMOUNT || value < -this.MOVE_AMOUNT)
          this.reverseDirection();
        this.position[this.workingPlane] += this.direction;
        this.mesh.position[this.workingPlane] =
          this.position[this.workingPlane];
      }
    }
  }

  class GameClass {
    STATES = {
      LOADING: "loading",
      PLAYING: "playing",
      READY: "ready",
      ENDED: "ended",
      RESETTING: "resetting",
    };
    blocks: Block[] = [];
    state: string = this.STATES.LOADING;

    // groups

    newBlocks: any;
    placedBlocks: any;
    choppedBlocks: any;

    // UI elements

    scoreContainer: any;
    mainContainer: any;
    startButton: any;
    instructions: any;

    constructor() {
      this.stage = new Stage();

      this.mainContainer = document.getElementById("container");
      this.scoreContainer = document.getElementById("score");
      // this.startButton = document.getElementById("start-button");
      // this.instructions = document.getElementById("instructions");
      this.scoreContainer.innerHTML = "0";

      this.newBlocks = new THREE.Group();
      this.placedBlocks = new THREE.Group();
      this.choppedBlocks = new THREE.Group();

      this.stage.add(this.newBlocks);
      this.stage.add(this.placedBlocks);
      this.stage.add(this.choppedBlocks);

      this.addBlock();
      this.tick();

      this.updateState(this.STATES.READY);

      document.addEventListener("click", () => {
        this.onAction();
      });

      document.addEventListener("touchstart", (e) => {
        e.preventDefault();
      });
    }

    updateState(newState: any) {
      for (let key in this.STATES)
        this.mainContainer.classList.remove(this.STATES[key]);
      this.mainContainer.classList.add(newState);
      this.state = newState;
    }

    onAction() {
      switch (this.state) {
        case this.STATES.READY:
          this.startGame();
          break;
        case this.STATES.PLAYING:
          this.placeBlock();
          break;
        case this.STATES.ENDED:
          // this.restartGame();
          break;
      }
    }

    startGame() {
      if (this.state != this.STATES.PLAYING) {
        this.scoreContainer.innerHTML = "0";
        this.updateState(this.STATES.PLAYING);
        this.addBlock();
      }
    }

    placeBlock() {
      let currentBlock = this.blocks[this.blocks.length - 1];
      let newBlocks: BlockReturn = currentBlock.place();
      this.newBlocks.remove(currentBlock.mesh);
      if (newBlocks.placed) this.placedBlocks.add(newBlocks.placed);
      if (newBlocks.chopped) {
        this.choppedBlocks.add(newBlocks.chopped);
        let positionParams = {
          y: "-=30",
          ease: Power1.easeIn,
          onComplete: () => this.choppedBlocks.remove(newBlocks.chopped),
        };
        let rotateRandomness = 10;
        let rotationParams = {
          delay: 0.05,
          x:
            newBlocks.plane == "z"
              ? Math.random() * rotateRandomness - rotateRandomness / 2
              : 0.1,
          z:
            newBlocks.plane == "x"
              ? Math.random() * rotateRandomness - rotateRandomness / 2
              : 0.1,
          y: Math.random() * 0.1,
        };
        if (
          newBlocks.chopped.position[newBlocks.plane] >
          newBlocks.placed.position[newBlocks.plane]
        ) {
          positionParams[newBlocks.plane] =
            "+=" + 40 * Math.abs(newBlocks.direction);
        } else {
          positionParams[newBlocks.plane] =
            "-=" + 40 * Math.abs(newBlocks.direction);
        }
        TweenLite.to(newBlocks.chopped.position, 1, positionParams);
        TweenLite.to(newBlocks.chopped.rotation, 1, rotationParams);
      }

      this.addBlock();
    }

    addBlock() {
      let lastBlock = this.blocks[this.blocks.length - 1];

      if (lastBlock && lastBlock.state == lastBlock.STATES.MISSED) {
        return this.endGame();
      }

      this.scoreContainer.innerHTML = String(this.blocks.length - 1);

      let newKidOnTheBlock = new Block(lastBlock);
      this.newBlocks.add(newKidOnTheBlock.mesh);
      this.blocks.push(newKidOnTheBlock);

      this.stage.setCamera(this.blocks.length * 2);

      // if (this.blocks.length >= 5) this.instructions.classList.add("hide");
    }

    endGame() {
      this.updateState(this.STATES.ENDED);
      UpdateScore(this.scoreContainer.innerHTML);
    }

    tick() {
      this.blocks[this.blocks.length - 1].tick();
      this.stage.render();
      requestAnimationFrame(() => {
        this.tick();
      });
    }
  }

  const StartGame = () => {
    setLoadingGame(true);
    setShowMenu(false);
    let postData = { user_id: user.user_id };
    axios
      .post(import.meta.env.VITE_API_URL + "/start_game", postData)
      .then((res) => {
        console.log(res.data[0]);
        setLoadingGame(false);
        if (!res.data[0].error) {
          setIsStart(true);
        } else {
          setIsStart(false);
          setShowMenu(true);
          Toast("error", "You don't have any token to play a game.");
          let userInfo1 = JSON.parse(localStorage.getItem("user")!);
          userInfo1.total_token = 0;
          setUser(userInfo1);
          localStorage.setItem("user", JSON.stringify(userInfo1));
          setShowModal(true);
        }
      })
      .catch((err) => {
        setLoadingGame(false);
        setIsStart(false);
        console.log("Fetch StartGame:", err);
      });
  };

  const UpdateScore = (score: number) => {
    setScore(score);
    setShowScore(true);
    setGaming(null);
    setShowMenu(true);
    setIsStart(false);
    if (Number(score) <= Number(user.score)) {
      let userInfo1 = user;
      userInfo1.total_token = user.total_token - 1;
      setUser(userInfo1);
      localStorage.setItem("user", JSON.stringify(userInfo1));
    } else {
      let postData = { user_id: user.user_id, score: Number(score) };
      axios
        .post(import.meta.env.VITE_API_URL + "/submit_score", postData)
        .then((res) => {
          console.log("user fetch res", res.data[0]);
          let userInfo1 = user;
          userInfo1.total_token = user.total_token - 1;
          userInfo1.score = score;
          setUser(userInfo1);
          localStorage.setItem("user", JSON.stringify(userInfo1));
        })
        .catch((err) => {
          console.log("UpdateScore", err);
        });
    }
  };
  
  const BuyToken = async () => {
    if (tokenCount < 1) {
      Toast("w", "Please enter number more than 0");
      return;
    }
    // if (user.sign == null) {
    //   SignWallet();
    //   return;
    // }
    try {
      await switchChain(config, {
        chainId: +import.meta.env.VITE_CHAIN_ID,
      });

      const abi = [
        {
          inputs: [],
          stateMutability: "nonpayable",
          type: "constructor",
        },
        {
          inputs: [],
          name: "buyGameToken",
          outputs: [],
          stateMutability: "payable",
          type: "function",
        },
        {
          inputs: [],
          name: "deployer",
          outputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
      ];

      const txHash = await writeContractAsync({
        address: "0x7D2E00dDFA500a2A4b4DD5f75cC65B2ff7D29255", //lenz
        abi,
        chainId: +import.meta.env.VITE_CHAIN_ID,
        functionName: "buyGameToken",
        value: parseEther("" + tokenCount * 0.0001),
      });
      console.log("txhash result", txHash);
      setTxHash(txHash);
    } catch (error: any) {
      console.log("Failed to send transaction:", error.message);
      console.log(error.message.split(".")[0]);
      let message = "error on transaction";
      switch (error.message.split(".")[0]) {
        case "User rejected the request":
          message = "Transaction canceled.";
          break;
      }
      Toast("error", message);
    }
  };

  useEffect(() => {
    console.log("isConfirmed", isConfirmed);
    if (isConfirmed) {
      AddTokensToPRofile();
    }
    return () => {};
  }, [isConfirmed]);

  const AddTokensToPRofile = () => {
    let postData = {
      user_id: user.user_id,
      token_amount: Number(tokenCount),
      hash: txHash,
    };
    axios
      .post(import.meta.env.VITE_API_URL + "/buy_token", postData)
      .then((res) => {
        Toast("success", "Ticket Added to Your Profile.");
        if (!res.data[0].error) {
        } else {
          Toast("e", res.data[0].message);
        }
      })
      .catch((err) => {
        console.log("Fetch user Data Error:", err);
      });
    FetchUser();
  };

  const FetchUser = () => {
    let userInfo1 = JSON.parse(localStorage.getItem("user"));
    let postData = {
      user_id: "" + userInfo1.user_id,
      user_name: userInfo1.user_name,
    };
    axios({
      method: "post",
      url: import.meta.env.VITE_API_URL + "/user",
      data: postData,
    })
      .then((res) => {
        setUser(res.data);
        localStorage.setItem("user", JSON.stringify(res.data));
      })
      .catch((err) => {
        if (err.response) {
          console.log("Fetch user Data Error Response:", err.response);
        }
      });
  };

  return (
    <Main showHeader={showMenu}>
      <HeadMeta title="Play Game" />
      <div className="relative">
        {isStart && (
          <div id="container">
            <div id="game"></div>
            <div id="score">0</div>
          </div>
        )}

        {!isStart && (
          <div
            style={{ backgroundImage: `url(${gameBack})` }}
            className="fixed top-0 bottom-0 right-0 left-0 bg-contain"
          >
            <div className=" mt-10 flex justify-between px-4 text-center uppercase">
              <div
                className="bg-no-repeat text-black p-3 w-20 cursor-pointer"
                style={{
                  backgroundImage: `url(${ticketBg})`,
                  backgroundSize: "100% 100%",
                }}
                onClick={() => setShowModal(true)}
              >
                <div>ticket</div>
                <div>{user?.total_token}</div>
              </div>
              <div className="bg-primary text-black p-3 rounded-2xl w-20">
                <div>score</div>
                <div>{user?.score}</div>
              </div>
            </div>
            <div className="fixed left-4 right-4 bottom-24 flex justify-center items-center">
              {!loadingGame && !isConfirming ? (
                <div className="flex gap-2 w-full">
                  <Button
                    label="Start Game"
                    onClick={() => StartGame()}
                    className="w-full"
                  />
                </div>
              ) : (
                <div className="flex justify-center items-center">
                  <RotatingLines
                    visible={true}
                    width="24"
                    strokeWidth="5"
                    animationDuration="0.75"
                    ariaLabel="rotating-lines-loading"
                    strokeColor="yellow"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showScore && (
        <div className="fixed top-0 bottom-0 left-0 right-0 bg-black/60 z-[1000]">
          <div
            className="w-full h-full"
            onClick={() => setShowScore(false)}
          ></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg p-4">
            <div
              className="w-60 mx-auto pt-4 pb-12 rounded-3xl h-80 bg-cover"
              style={{ backgroundImage: `url(${splash})` }}
            >
              <div className="flex flex-col items-center">
                <div
                  className="bg-primary rounded-full w-8 h-8 p-2 text-center absolute top-5 right-5 flex justify-center items-center cursor-pointer"
                  onClick={() => setShowScore(false)}
                >
                  X
                </div>
                <h2 className="text-primary mb-6 text-3xl">Game Over</h2>
                <p className="text-2xl text-white mb-2">Score : {score}</p>
                <p className="text-xl text-white">
                  Your Weekly Best Score : {user?.score}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed top-0 bottom-0 left-0 right-0 bg-black/60 z-[1000]">
          <div
            className="w-full h-full"
            onClick={() => setShowModal(false)}
          ></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg p-4">
            <div className="w-60 mx-auto bg-black pt-4 pb-12 rounded-3xl flex flex-col items-center">
              <h2 className="text-primary mb-2 text-2xl">BUY TOKENS</h2>
              <Input
                onChange={(e: { target: { value: SetStateAction<number> } }) =>
                  setTokenCount(e.target.value)
                }
                type="number"
                error={undefined}
                label="Number of token"
                value={tokenCount}
                onBlur={undefined}
                className="mb-4"
              />
              {!isPending && !isConfirming ? (
                <Button label="Buy Token" onClick={BuyToken} className="mb-5" />
              ) : (
                <div className="flex justify-center items-center">
                  <RotatingLines
                    visible={true}
                    width="24"
                    strokeWidth="5"
                    animationDuration="0.75"
                    ariaLabel="rotating-lines-loading"
                    strokeColor="green"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Main>
  );
}
