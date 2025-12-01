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
    
    def __init__(self, client_manager=None):
        self.loop = None
        self.message_queue = None
        self.callbacks = {}
        self._running = False
        self.client_manager = client_manager  # Add client manager reference
        
    async def start(self):
        """Start message processing"""
        print(f"[MESSAGE HANDLER] Starting message handler...")
        
        # Get the running loop and create queue in the correct context
        self.loop = asyncio.get_running_loop()
        self.message_queue = asyncio.Queue()
        print(f"[MESSAGE HANDLER] Event loop captured: {self.loop}")
        print(f"[MESSAGE HANDLER] Message queue created: {self.message_queue}")
        
        self._running = True
        # Launch processing as separate task, don't await it
        # This allows the event loop to handle other coroutines concurrently
        self._process_task = asyncio.create_task(self._process_messages())
        print(f"[MESSAGE HANDLER] Message processing task created")
        print(f"[MESSAGE HANDLER] Event loop is now free for other tasks")
        
    async def stop(self):
        """Stop message processing"""
        print(f"🛑 [MESSAGE HANDLER] Stopping message handler...")
        self._running = False
        if hasattr(self, '_process_task'):
            try:
                # Wait for task to finish gracefully
                await asyncio.wait_for(self._process_task, timeout=5.0)
                print(f"[MESSAGE HANDLER] Message processing task stopped gracefully")
            except asyncio.TimeoutError:
                print(f"⏱️ [MESSAGE HANDLER] Task didn't stop in time, cancelling...")
                self._process_task.cancel()
                try:
                    await self._process_task
                except asyncio.CancelledError:
                    print(f"[MESSAGE HANDLER] Message processing task cancelled")
        print(f"[MESSAGE HANDLER] Message handler stopped")
        
    def register_callback(self, message_type: str, callback: Callable):
        """Register callback for message type"""
        self.callbacks[message_type] = callback
        
    async def send_to_mobile(self, client_id: str, message: Dict[str, Any], 
                            websocket_send: Callable):
        """Send message to mobile client"""
        try:
            print(f"[MESSAGE HANDLER] ==================== SEND TO MOBILE ====================")
            print(f"[MESSAGE HANDLER] Sending to mobile {client_id}: {message.get('type')}")
            print(f"[MESSAGE HANDLER] Message keys: {list(message.keys())}")
            print(f"[MESSAGE HANDLER] websocket_send type: {type(websocket_send)}")
            print(f"[MESSAGE HANDLER] websocket_send callable: {callable(websocket_send)}")
            # websocket_send may be a function returning a send callable; resolve it
            send_callable = websocket_send(client_id) if callable(websocket_send) else websocket_send
            print(f"[MESSAGE HANDLER] send_callable type: {type(send_callable)}")
            print(f"[MESSAGE HANDLER] Calling send_callable with message...")
            # Pass raw dict; lower layer will JSON-encode once
            await send_callable(message)
            print(f"[MESSAGE HANDLER] Successfully sent to mobile {client_id}")
            logger.debug(f"Sent to mobile client {client_id}: {message['type']}")
        except Exception as e:
            print(f"❌ [MESSAGE HANDLER] Error sending to mobile {client_id}: {e}")
            logger.error(f"Error sending to mobile client {client_id}: {e}")
            import traceback
            traceback.print_exc()
            
    async def send_to_flower(self, client_id: str, message: Dict[str, Any], 
                            flower_client: Any):
        """Send message to Flower client"""
        try:
            print(f"[MESSAGE HANDLER] Sending to Flower {client_id}: {message.get('type')}")
            print(f"[MESSAGE HANDLER] Message keys: {list(message.keys())}")
            # flower_client may be a function returning the actual client; resolve it
            client_obj = flower_client(client_id) if callable(flower_client) else flower_client
            if client_obj is None:
                print(f"❌ [MESSAGE HANDLER] No Flower client available for {client_id}")
                raise RuntimeError(f"No Flower client available for {client_id}")

            if message["type"] == "weights_update":
                print(f"[MESSAGE HANDLER] Updating weights for Flower client {client_id}")
                # set_mobile_weights is sync; do not await
                client_obj.set_mobile_weights(message["weights"])
            elif message["type"] == "training_complete":
                print(f"[MESSAGE HANDLER] Completing training for Flower client {client_id}")
                client_obj.complete_training(message["result"])
            elif message["type"] == "evaluate_complete":
                print(f"[MESSAGE HANDLER] Completing evaluation for Flower client {client_id}")
                client_obj.complete_evaluation(message["result"])
            print(f"[MESSAGE HANDLER] Successfully sent to Flower {client_id}")
            logger.debug(f"Sent to Flower client {client_id}: {message['type']}")
        except Exception as e:
            print(f"❌ [MESSAGE HANDLER] Error sending to Flower {client_id}: {e}")
            logger.error(f"Error sending to Flower client {client_id}: {e}")
            
    async def queue_message(self, context: MessageContext, message: Dict[str, Any]):
        """Queue message for processing"""
        print(f"[MESSAGE HANDLER] Queuing message type='{message.get('type')}' for client={context.client_id}")
        print(f"[MESSAGE HANDLER] Queue size before put: {self.message_queue.qsize()}")
        await self.message_queue.put((context, message))
        print(f"[MESSAGE HANDLER] Message queued successfully, queue size now: {self.message_queue.qsize()}")
        
    async def _process_messages(self):
        """Process queued messages"""
        print(f"[MESSAGE HANDLER] _process_messages loop started, running={self._running}")
        while self._running:
            try:
                # Note: This log appears every loop, but queue.get() blocks until message arrives
                # print(f"[MESSAGE HANDLER] Waiting for next message from queue...")
                context, message = await self.message_queue.get()
                print(f"[MESSAGE HANDLER] ==================== MESSAGE RECEIVED FROM QUEUE ====================")
                message_type = message.get("type")
                
                print(f"[MESSAGE HANDLER] Got message from queue: type='{message_type}' for client={context.client_id}")
                print(f"[MESSAGE HANDLER] Available callbacks: {list(self.callbacks.keys())}")
                
                if message_type in self.callbacks:
                    print(f"[MESSAGE HANDLER] Found callback for '{message_type}', executing...")
                    try:
                        await self.callbacks[message_type](context, message)
                        print(f"[MESSAGE HANDLER] Callback for '{message_type}' completed successfully")
                    except Exception as e:
                        print(f"[MESSAGE HANDLER] ❌ Error in callback for {message_type}: {e}")
                        logger.error(f"Error in callback for {message_type}: {e}")
                        import traceback
                        traceback.print_exc()
                else:
                    print(f"[MESSAGE HANDLER] ⚠️ No handler registered for message type: {message_type}")
                    logger.warning(f"No handler for message type: {message_type}")
                    
                self.message_queue.task_done()
            except Exception as e:
                print(f"[MESSAGE HANDLER] ❌ Error processing message: {e}")
                logger.error(f"Error processing message: {e}")
                await asyncio.sleep(0.1)  # Prevent tight loop on error
                
    async def handle_mobile_message(self, client_id: str, message: Dict[str, Any],
                                  flower_client: Any):
        """Handle message from mobile client"""
        print(f"[MESSAGE HANDLER] Received from mobile {client_id}: {message.get('type')}")
        print(f"[MESSAGE HANDLER] Message keys: {list(message.keys())}")
        
        context = MessageContext(client_id=client_id)
        
        if message["type"] == "start_training":
            context.round_num = message.get("round", 0)
            context.config = message.get("config", {})
            print(f"[MESSAGE HANDLER] Training round: {context.round_num}")
            
        logger.info(f"[MSG] from mobile {client_id}: {message.get('type')} keys={list(message.keys())}")
        await self.queue_message(context, message)
        
    async def handle_flower_message(self, client_id: str, message: Dict[str, Any],
                                  websocket_send: Callable):
        """Handle message from Flower client"""
        print(f"[MESSAGE HANDLER] ==================== FLOWER MESSAGE ====================")
        print(f"[MESSAGE HANDLER] Received from Flower for client {client_id}")
        print(f"[MESSAGE HANDLER] Message type: {message.get('type')}")
        print(f"[MESSAGE HANDLER] Message keys: {list(message.keys())}")
        
        context = MessageContext(client_id=client_id)
        
        if message["type"] == "fit":
            context.round_num = message.get("round", 0)
            context.config = message.get("config", {})
            print(f"[MESSAGE HANDLER] Fit round: {context.round_num}")
            print(f"[MESSAGE HANDLER] Config: {context.config}")
            print(f"[MESSAGE HANDLER] Weights: {len(message.get('weights', []))} layers")
            
        print(f"[MESSAGE HANDLER] Queuing message for processing...")
        await self.queue_message(context, message)
        print(f"[MESSAGE HANDLER] Message queued successfully")
        
    def create_standard_handlers(self, websocket_send: Callable, flower_client: Any):
        """Create standard message handlers"""
        
        async def handle_start_training(context: MessageContext, message: Dict):
            """Handle training start request from mobile to server"""
            print(f"[MESSAGE HANDLER] Handling start_training for {context.client_id}")
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
            weights = message.get("weights", [])
            num_samples = message.get("num_samples", 0)
            metrics = message.get("metrics", {})
            
            print(f"[MESSAGE HANDLER] Handling training_complete for {context.client_id}")
            print(f"[MESSAGE HANDLER] Forwarding to Flower: {len(weights)} weights, {num_samples} samples")
            print(f"[MESSAGE HANDLER] Metrics: {metrics}")
            
            # Update client-server training completion - FIXED!
            if self.client_manager:
                self.client_manager.complete_client_training(context.client_id)
                print(f"✅ [MESSAGE HANDLER] Updated client-server training status: Client {context.client_id} completed training")
            
            await self.send_to_flower(context.client_id, {
                "type": "training_complete",
                "result": {
                    "weights": weights,
                    "metrics": metrics,
                    "num_samples": num_samples
                }
            }, flower_client)
            # Let mobile know server acknowledged completion
            await self.send_to_mobile(context.client_id, {
                "type": "training_acknowledged"
            }, websocket_send)
            
        async def handle_fit_request(context: MessageContext, message: Dict):
            """Handle fit request from Flower: instruct mobile to start training"""
            print(f"[MESSAGE HANDLER] ==================== HANDLE FIT REQUEST ====================")
            print(f"[MESSAGE HANDLER] Handling fit_request for {context.client_id}")
            print(f"[MESSAGE HANDLER] Round: {context.round_num}")
            print(f"[MESSAGE HANDLER] Including weights: {len(message.get('weights', []))} weight layers")
            
            # Update client-server round tracking - FIXED!
            if self.client_manager and context.round_num is not None:
                self.client_manager.start_client_training(context.client_id, context.round_num)
                print(f"✅ [MESSAGE HANDLER] Updated client-server round tracking: Client {context.client_id} -> Round {context.round_num}")
            
            # Ensure config is a dict (not ConfigRecord) for JSON serialization
            config = context.config if context.config is not None else {}
            print(f"[MESSAGE HANDLER] Config type before conversion: {type(config)}")
            if not isinstance(config, dict):
                try:
                    config = dict(config) if hasattr(config, '__iter__') and not isinstance(config, str) else {}
                    print(f"[MESSAGE HANDLER] Converted config to dict: {type(config)}")
                except Exception as e:
                    print(f"⚠️ [MESSAGE HANDLER] Warning: Could not convert config to dict: {e}, using empty dict")
                    config = {}
            
            print(f"[MESSAGE HANDLER] Final config: {config}")
            print(f"[MESSAGE HANDLER] Sending start_training to mobile client {context.client_id}")
            
            await self.send_to_mobile(context.client_id, {
                "type": "start_training",
                "round": context.round_num,
                "config": config,
                "weights": message.get("weights", [])  # Include weights from server
            }, websocket_send)
            
            print(f"[MESSAGE HANDLER] start_training message sent to mobile")

        async def handle_evaluate_request(context: MessageContext, message: Dict):
            """Handle evaluation request from Flower server to mobile client"""
            parameters = message.get("parameters", [])
            config = message.get("config", {})
            
            print(f"[MESSAGE HANDLER] Handling evaluate_request for {context.client_id}")
            print(f"[MESSAGE HANDLER] Parameters: {len(parameters)} layers, Config: {config}")
            
            # Forward evaluation request to mobile client
            await self.send_to_mobile(context.client_id, {
                "type": "evaluate_request",
                "parameters": parameters,
                "config": config
            }, websocket_send)
            
            print(f"[MESSAGE HANDLER] evaluate_request message sent to mobile")

        async def handle_evaluate_complete(context: MessageContext, message: Dict):
            """Handle evaluation completion from mobile client"""
            loss = message.get("loss", 0.0)
            accuracy = message.get("accuracy", 0.0)
            num_examples = message.get("num_examples", 100)
            metrics = message.get("metrics", {})
            
            print(f"[MESSAGE HANDLER] Handling evaluate_complete for {context.client_id}")
            print(f"[MESSAGE HANDLER] Loss: {loss}, Accuracy: {accuracy}, Num examples: {num_examples}")
            print(f"[MESSAGE HANDLER] Metrics: {metrics}")
            
            # Forward evaluation results to Flower client
            await self.send_to_flower(context.client_id, {
                "type": "evaluate_complete",
                "result": {
                    "loss": loss,
                    "accuracy": accuracy,
                    "num_examples": num_examples,
                    "metrics": metrics
                }
            }, flower_client)
            
            print(f"[MESSAGE HANDLER] Evaluation results forwarded to Flower client")
            
        # Register standard handlers
        self.register_callback("start_training", handle_start_training)
        self.register_callback("update_weights", handle_update_weights)
        self.register_callback("training_update", handle_training_update)
        self.register_callback("training_complete", handle_training_complete)
        self.register_callback("evaluate_request", handle_evaluate_request)
        self.register_callback("evaluate_complete", handle_evaluate_complete)
        self.register_callback("fit", handle_fit_request)
