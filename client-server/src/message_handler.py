"""
Message Handler for FedMob
Handles bi-directional communication between components
"""

import logging
import json
from typing import Dict, Any, Optional, Callable
import asyncio
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class MessageContext:
    """Context for message handling"""
    client_id: str
    round_num: Optional[int] = None
    config: Optional[Dict] = None

class MessageHandler:
    """Handles message routing and processing"""
    
    def __init__(self):
        self.loop = None
        self.message_queue = None
        self.callbacks = {}
        self._running = False

    def initialize(self, loop):
        """Initialize with the provided event loop"""
        self.loop = loop
        self.message_queue = asyncio.Queue()
        
    async def start(self):
        """Start message processing"""
        self._running = True
        await self._process_messages()
        
    async def stop(self):
        """Stop message processing"""
        self._running = False
        
    def register_callback(self, message_type: str, callback: Callable):
        """Register callback for message type"""
        self.callbacks[message_type] = callback
        
    async def send_to_mobile(self, client_id: str, message: Dict[str, Any], 
                            websocket_send: Callable):
        """Send message to mobile client"""
        try:
            print(f"📤 [MESSAGE HANDLER] Sending to mobile {client_id}: {message.get('type')}")
            print(f"📤 [MESSAGE HANDLER] Message keys: {list(message.keys())}")
            # websocket_send may be a function returning a send callable; resolve it
            send_callable = websocket_send(client_id) if callable(websocket_send) else websocket_send
            # Pass raw dict; lower layer will JSON-encode once
            await send_callable(message)
            print(f"✅ [MESSAGE HANDLER] Successfully sent to mobile {client_id}")
            logger.debug(f"Sent to mobile client {client_id}: {message['type']}")
        except Exception as e:
            print(f"❌ [MESSAGE HANDLER] Error sending to mobile {client_id}: {e}")
            logger.error(f"Error sending to mobile client {client_id}: {e}")
            
    async def send_to_flower(self, client_id: str, message: Dict[str, Any], 
                            flower_client: Any):
        """Send message to Flower client"""
        try:
            print(f"📤 [MESSAGE HANDLER] Sending to Flower {client_id}: {message.get('type')}")
            print(f"📤 [MESSAGE HANDLER] Message keys: {list(message.keys())}")
            # flower_client may be a function returning the actual client; resolve it
            client_obj = flower_client(client_id) if callable(flower_client) else flower_client
            if client_obj is None:
                print(f"❌ [MESSAGE HANDLER] No Flower client available for {client_id}")
                raise RuntimeError(f"No Flower client available for {client_id}")

            if message["type"] == "weights_update":
                print(f"📤 [MESSAGE HANDLER] Updating weights for Flower client {client_id}")
                # set_mobile_weights is sync; do not await
                client_obj.set_mobile_weights(message["weights"])
            elif message["type"] == "training_complete":
                print(f"📤 [MESSAGE HANDLER] Completing training for Flower client {client_id}")
                client_obj.complete_training(message["result"])
            print(f"✅ [MESSAGE HANDLER] Successfully sent to Flower {client_id}")
            logger.debug(f"Sent to Flower client {client_id}: {message['type']}")
        except Exception as e:
            print(f"❌ [MESSAGE HANDLER] Error sending to Flower {client_id}: {e}")
            logger.error(f"Error sending to Flower client {client_id}: {e}")
            
    async def queue_message(self, context: MessageContext, message: Dict[str, Any]):
        """Queue message for processing"""
        await self.message_queue.put((context, message))
        
    async def _process_messages(self):
        """Process queued messages"""
        while self._running:
            try:
                context, message = await self.message_queue.get()
                message_type = message.get("type")
                
                if message_type in self.callbacks:
                    try:
                        await self.callbacks[message_type](context, message)
                    except Exception as e:
                        logger.error(f"Error in callback for {message_type}: {e}")
                else:
                    logger.warning(f"No handler for message type: {message_type}")
                    
                self.message_queue.task_done()
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                await asyncio.sleep(0.1)  # Prevent tight loop on error
                
    async def handle_mobile_message(self, client_id: str, message: Dict[str, Any],
                                  flower_client: Any):
        """Handle message from mobile client"""
        print(f"📱 [MESSAGE HANDLER] Received from mobile {client_id}: {message.get('type')}")
        print(f"📱 [MESSAGE HANDLER] Message keys: {list(message.keys())}")
        
        context = MessageContext(client_id=client_id)
        
        if message["type"] == "start_training":
            context.round_num = message.get("round", 0)
            context.config = message.get("config", {})
            print(f"📱 [MESSAGE HANDLER] Training round: {context.round_num}")
            
        logger.info(f"[MSG] from mobile {client_id}: {message.get('type')} keys={list(message.keys())}")
        await self.queue_message(context, message)
        
    async def handle_flower_message(self, client_id: str, message: Dict[str, Any],
                                  websocket_send: Callable):
        """Handle message from Flower client"""
        print(f"🌸 [MESSAGE HANDLER] Received from Flower {client_id}: {message.get('type')}")
        print(f"🌸 [MESSAGE HANDLER] Message keys: {list(message.keys())}")
        
        context = MessageContext(client_id=client_id)
        
        if message["type"] == "fit":
            context.round_num = message.get("round", 0)
            context.config = message.get("config", {})
            print(f"🌸 [MESSAGE HANDLER] Fit round: {context.round_num}")
            
        await self.queue_message(context, message)
        
    def create_standard_handlers(self, websocket_send: Callable, flower_client: Any):
        """Create standard message handlers"""
        
        async def handle_start_training(context: MessageContext, message: Dict):
            """Handle training start request from mobile to server"""
            print(f"🎯 [MESSAGE HANDLER] Handling start_training for {context.client_id}")
            # Forward weights (if any) to Flower client
            await self.send_to_flower(context.client_id, {
                "type": "weights_update",
                "weights": message.get("weights", [])
            }, flower_client)
            # Acknowledge to mobile that training start was received
            await self.send_to_mobile(context.client_id, {
                "type": "training_started",
                "round": context.round_num
            }, websocket_send)
            
        async def handle_training_update(context: MessageContext, message: Dict):
            """Handle training progress update"""
            await self.send_to_mobile(context.client_id, {
                "type": "progress_acknowledged",
                "progress": message.get("progress", 0)
            }, websocket_send)
            
        async def handle_update_weights(context: MessageContext, message: Dict):
            """Handle per-epoch weight updates from mobile"""
            await self.send_to_flower(context.client_id, {
                "type": "weights_update",
                "weights": message.get("weights", [])
            }, flower_client)

        async def handle_training_complete(context: MessageContext, message: Dict):
            """Handle training completion"""
            print(f"🎯 [MESSAGE HANDLER] Handling training_complete for {context.client_id}")
            await self.send_to_flower(context.client_id, {
                "type": "training_complete",
                "result": {
                    "weights": message.get("weights", []),
                    "metrics": message.get("metrics", {}),
                    "num_samples": message.get("num_samples", 0)
                }
            }, flower_client)
            # Let mobile know server acknowledged completion
            await self.send_to_mobile(context.client_id, {
                "type": "training_acknowledged"
            }, websocket_send)
            
        async def handle_fit_request(context: MessageContext, message: Dict):
            """Handle fit request from Flower: instruct mobile to start training"""
            print(f"🎯 [MESSAGE HANDLER] Handling fit_request for {context.client_id}")
            await self.send_to_mobile(context.client_id, {
                "type": "start_training",
                "round": context.round_num,
                "config": context.config
            }, websocket_send)
            
        # Register standard handlers
        self.register_callback("start_training", handle_start_training)
        self.register_callback("update_weights", handle_update_weights)
        self.register_callback("training_update", handle_training_update)
        self.register_callback("training_complete", handle_training_complete)
        self.register_callback("fit", handle_fit_request)
