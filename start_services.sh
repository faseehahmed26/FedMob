#!/bin/bash

# FedMob Service Startup Script
# This script starts all required services in the correct order

echo "🚀 Starting FedMob Services..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${RED}❌ Port $port is already in use${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Port $port is available${NC}"
        return 0
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local port=$1
    local service_name=$2
    local max_attempts=30
    local attempt=0
    
    echo -e "${YELLOW}⏳ Waiting for $service_name to be ready on port $port...${NC}"
    
    while [ $attempt -lt $max_attempts ]; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
            echo -e "${GREEN}✅ $service_name is ready!${NC}"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ $service_name failed to start on port $port${NC}"
    return 1
}

# Check if we're in the right directory
if [ ! -f "fedmob-project/README.md" ]; then
    echo -e "${RED}❌ Please run this script from the project root directory${NC}"
    exit 1
fi

# Check if virtual environments exist
if [ ! -d "fedmob-project/flower-server/venv" ]; then
    echo -e "${RED}❌ Flower server virtual environment not found${NC}"
    echo "Please run: cd fedmob-project/flower-server && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

if [ ! -d "fedmob-project/client-server/venv" ]; then
    echo -e "${RED}❌ Client server virtual environment not found${NC}"
    echo "Please run: cd fedmob-project/client-server && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Check ports
echo -e "${BLUE}🔍 Checking ports...${NC}"
check_port 8080 || exit 1
check_port 8082 || exit 1

# Start Flower Server
echo -e "${BLUE}🌺 Starting Flower Server on port 8080...${NC}"
cd fedmob-project/flower-server
source venv/bin/activate
python server.py &
FLOWER_PID=$!
cd ../..

# Wait for Flower server to be ready
wait_for_service 8080 "Flower Server" || exit 1

# Start Client Server
echo -e "${BLUE}🔗 Starting Client Server on port 8082...${NC}"
cd fedmob-project/client-server
source venv/bin/activate
python src/server.py &
CLIENT_PID=$!
cd ../..

# Wait for Client server to be ready
wait_for_service 8082 "Client Server" || exit 1

echo -e "${GREEN}🎉 All services started successfully!${NC}"
echo ""
echo -e "${YELLOW}📱 Next steps:${NC}"
echo "1. Start your mobile app: cd fedmob-project/MobileClient && npx react-native run-ios"
echo "2. Or test connection: python test_connection.py"
echo ""
echo -e "${YELLOW}🛑 To stop services:${NC}"
echo "kill $FLOWER_PID $CLIENT_PID"
echo ""
echo -e "${BLUE}📊 Service Status:${NC}"
echo "Flower Server (PID: $FLOWER_PID): http://localhost:8080"
echo "Client Server (PID: $CLIENT_PID): ws://localhost:8082"
echo "Mobile App: Connect to 10.118.29.192:8082"

# Keep script running and show logs
echo -e "${YELLOW}📋 Press Ctrl+C to stop all services${NC}"
trap "echo -e '\n${YELLOW}🛑 Stopping services...${NC}'; kill $FLOWER_PID $CLIENT_PID 2>/dev/null; exit 0" INT

# Wait for user to stop
wait
