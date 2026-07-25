/**
 * @file apps/socket-service/src/matchmaker.js
 * @description Dynamic Matchmaker & Room Socket Manager
 */

export * from '../../websocket-service/src/matchmaker.js';
import { handleRequestStartMatch, setupMatchmakerListeners, registerSocketToRoom, unregisterSocketFromRoom, getRoomSocketIds, setRoomDocument, getRoomDocument } from '../../websocket-service/src/matchmaker.js';
export default handleRequestStartMatch;
