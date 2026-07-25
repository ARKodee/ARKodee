/**
 * @file apps/websocket-service/src/services/redis.service.js
 * @description Redis Service (Pub/Sub & Client Manager)
 * 
 * This service manages connection state to the Redis server.
 * It provides:
 * 1. A standard Redis client for general key-value actions.
 * 2. Dedicated client instances for Redis Pub/Sub to listen to events
 *    published by the Django backend and publish events back.
 */

import { createClient } from 'redis';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

class RedisService {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.publisher = null;
  }

  async connect() {
    try {
      const redisUrl = config.redis.url;

      this.client = createClient({ url: redisUrl });
      this.subscriber = createClient({ url: redisUrl });
      this.publisher = createClient({ url: redisUrl });

      // Handle connection error events
      this.client.on('error', (err) => logger.error('Redis Client Error', err));
      this.subscriber.on('error', (err) => logger.error('Redis Subscriber Error', err));
      this.publisher.on('error', (err) => logger.error('Redis Publisher Error', err));

      // Connect all clients
      await Promise.all([
        this.client.connect(),
        this.subscriber.connect(),
        this.publisher.connect()
      ]);

      logger.info('Connected to Redis successfully');
    } catch (err) {
      logger.error('Failed to connect to Redis', err);
      throw err;
    }
  }

  /**
   * Subscribe to a Redis channel and handle incoming messages.
   * @param {string} channel - Channel name
   * @param {function} callback - Callback function receiving message payload
   */
  async subscribe(channel, callback) {
    if (!this.subscriber) {
      throw new Error('Redis subscriber is not connected');
    }
    await this.subscriber.subscribe(channel, (message) => {
      try {
        const parsedMessage = JSON.parse(message);
        callback(parsedMessage);
      } catch (err) {
        callback(message); // Fallback to raw string if JSON parsing fails
      }
    });
    logger.info(`Subscribed to Redis channel: ${channel}`);
  }

  /**
   * Publish a message to a Redis channel.
   * @param {string} channel - Channel name
   * @param {object|string} message - Event message payload
   */
  async publish(channel, message) {
    if (!this.publisher) {
      throw new Error('Redis publisher is not connected');
    }
    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    await this.publisher.publish(channel, payload);
  }
}

export const redisService = new RedisService();
