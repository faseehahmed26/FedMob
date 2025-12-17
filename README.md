# FedMob

**Federated learning on real mobile devices using a Flower-based server, a Python WebSocket bridge, and a React Native (Expo) mobile client.**

This repository contains three main components:

- **`flower-server/`**  
  Central Flower federated learning server

- **`client-server/`**  
  Python WebSocket bridge between mobile clients and the Flower server

- **`MobileClient/`**  
  React Native (Expo) mobile application running on one or more phones

---

## 1. Prerequisites

### Software
- **Python**: Version 3.8 or higher (tested with 3.9 and 3.13)
- **Node.js**: Version 18 or higher
- **npm**
- **Expo tooling**: `npx expo` (installed automatically via npm)

### Hardware and Network
- One laptop acting as the server
- One or two physical mobile phones with **Expo Go** installed
- All devices must be connected to the **same WiFi network**

---

## 2. Datasets

### Main Dataset
- **MNIST handwritten digits**  
  Original source: http://yann.lecun.com/exdb/mnist/

### Preprocessed Data Included in This Repository
- `shared/data/mnist_preprocessed.pkl`  
  Preprocessed MNIST for server-side experiments

- `MobileClient/src/data/mnist_train_1000.json`  
  Client-side training subset

- `MobileClient/src/data/mnist_test_200.json`  
  Client-side testing subset

- `MobileClient/src/assets/mnist-data/`  
  Small sample subsets for quick testing

No additional downloads are required to reproduce the baseline experiments. All necessary MNIST subsets are included.

### Regenerating or Customizing MNIST Splits
Scripts are provided in:
- `shared/scripts/setup_data.py`
- `shared/scripts/create_fixed_mnist.py`

---

## 3. Three-Terminal Quick Start (Recommended for Grading)

Open **three terminal windows** and navigate to the project root:

```bash
cd /Users/your-username/path/to/fedmob-project
````

---

### Terminal 1: Start Flower Server (`flower-server/`)

```bash
cd flower-server

# Optional (first time only)
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start Flower server with gRPC-Web proxy
python start_server.py
```

**Server details:**

* Prints your laptop IP address on startup
* Listens on:

  * Port `8080` for gRPC
  * Port `8081` for gRPC-Web and HTTP proxy

---

### Terminal 2: Start Python Client Bridge (`client-server/`)

```bash
cd client-server

# Optional (first time only)
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start WebSocket bridge
python src/server.py
```

**Bridge details:**

* Default port: `8082`
* Used when mobile clients communicate via WebSockets instead of gRPC-Web

---

### Terminal 3: Start Mobile App (`MobileClient/`)

> **Important**
> To run on a physical device, install **Expo Go version 2.32.2** (`expo-go-2.32.2.apk`) on your phone.

```bash
cd MobileClient

# Install dependencies (first time only)
npm install

# Start Expo development server
npm run start
```

---

### Connecting Mobile Devices

1. Scan the QR code using **Expo Go** on each phone.
2. Open the FedMob application.
3. In **Connection / Server Address**, enter your laptop IP:

   * Recommended (direct to Flower server via proxy):

     ```
     YOUR_LAPTOP_IP:8081
     ```
   * Using WebSocket bridge:

     ```
     YOUR_LAPTOP_IP:8082
     ```
4. Tap **Connect to Server**.
5. Wait until the status shows **Connected**.

---

## 4. Reproducing Preliminary Results

To reproduce the preliminary results reported in the end-term paper:

1. Start all three components as described above.
2. On each phone, confirm the status shows **Connected**.
3. On one phone:

   * Navigate to the **Training** screen.
   * Tap **Start FL Training**.
4. The system will:

   * Load the included MNIST subsets on each device
   * Run multiple federated learning rounds using FedAvg
5. Monitor progress:

   * **Mobile devices**: training rounds, loss, and accuracy
   * **Servers**: detailed logs in the Flower and bridge terminals

Using the default configuration and included datasets reproduces the qualitative trends reported in the paper, including convergence behavior and comparable accuracy ranges.

```
```
