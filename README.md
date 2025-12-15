## FedMob

Federated learning on real mobile devices using a Flower-based server, a Python WebSocket bridge, and a React Native (Expo) mobile client.

This repository contains three main components:

- **`flower-server/`**: Central Flower federated learning server
- **`client-server/`**: Python WebSocket bridge between mobile clients and the Flower server
- **`MobileClient/`**: React Native (Expo) mobile app running on one or more phones

---

## 1. Prerequisites

- **Python**: 3.8+ (tested with 3.9/3.13)
- **Node.js**: 18+ and **npm**
- **Expo tooling**: `npx expo` (installed automatically via `npm`)
- **Devices**:
  - 1 laptop (server)
  - 1–2 phones with Expo Go installed
  - All devices on the **same WiFi network**

---

## 2. Datasets

- **Main dataset**: MNIST handwritten digits  
  - Original source: [MNIST dataset](http://yann.lecun.com/exdb/mnist/)
- **Preprocessed data in this repo**:
  - `shared/data/mnist_preprocessed.pkl` – preprocessed MNIST for server-side experiments
  - `MobileClient/src/data/mnist_train_1000.json`, `MobileClient/src/data/mnist_test_200.json` – client-side JSON splits
  - `MobileClient/src/assets/mnist-data/` – small sample subsets for quick tests
- **No extra download is required** to reproduce the basic experiments; all needed MNIST subsets are already included.
- To regenerate or customize MNIST splits, see scripts in:
  - `shared/scripts/setup_data.py`
  - `shared/scripts/create_fixed_mnist.py`

---

## 3. Three-Terminal Quick Start (Recommended for Grading)

Open **three terminal windows** in the project root:

cd /Users/your-username/path/to/fedmob-project### Terminal 1 – Start Flower Server (`flower-server/`)

cd flower-server

# (Optional, first time only) create & activate venv
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Start Flower server with gRPC-Web proxy (listens on ports 8080 and 8081)
python start_with_proxy.py- The server will print your laptop **IP address** and listen on:
  - `8080` – gRPC
  - `8081` – gRPC-Web/HTTP proxy

### Terminal 2 – Start Python Client Bridge (`client-server/`)

cd client-server

# (Optional, first time only) create & activate venv
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Start WebSocket bridge (default: port 8082)
python src/server.py- This bridge can be used for experiments where the mobile app talks over WebSockets instead of direct gRPC-Web.
- By default it listens on `8082` on your laptop.

### Terminal 3 – Start Mobile App (`MobileClient/`)

> Note: To run the mobile app on a physical device, you must have the **Expo Go 2.32.2** app (`expo-go-2.32.2.apk`) installed on your phone.

cd MobileClient

# Install JS dependencies (first time only)
npm install

# Start Expo dev server
npm run start            # same as: npx expo startThen:

1. Scan the QR code with **Expo Go** on each phone.
2. Open the FedMob app on each device.
3. In the app’s **Connection / Server Address** section, set the server address to your laptop IP:
   - With proxy (recommended, direct to Flower server): `YOUR_LAPTOP_IP:8081`
   - If you configure the bridge instead: `YOUR_LAPTOP_IP:8082`
4. Tap **“Connect to Server”** on each phone and wait until status shows **Connected**.

---

## 4. Reproducing Preliminary Results

To reproduce the preliminary results reported in the endterm paper:

1. **Start all three components** as in Section 3 (three terminals).
2. On **each phone**:
   - Ensure the app shows **Connected** to the server.
3. On **one phone**:
   - Navigate to the **Training** screen.
   - Tap **“Start FL Training”**.
4. The system will:
   - Use the preloaded MNIST subsets on each device.
   - Run multiple federated learning rounds (FedAvg) coordinated by the Flower server.
5. You can monitor:
   - **On phones**: training progress, loss/accuracy, and round number.
   - **On servers**: logs printed in the `flower-server` and `client-server` terminals.

Using the default configuration and included datasets should reproduce the qualitative behavior and trends reported in the paper (convergence over rounds, similar accuracy ranges).

---