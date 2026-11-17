import React, { createContext } from 'react';
import { ReplayEngine } from '../engine/replayEngine';

export const EngineContext = createContext<ReplayEngine | null>(null);
