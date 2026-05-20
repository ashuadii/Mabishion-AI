import React, { createContext, useContext, useState, useCallback } from 'react';
import { mickiiThink } from '../engine/mickii';

const BuildContext = createContext();

export function BuildProvider({ children }) {
  const [currentBuild, setCurrentBuild] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const startNewBuild = useCallback(async (brief) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // 1. PHASE 1: RESEARCH
      const researchPrompt = `
        Conduct a Tier 1 & 2 market research and criticism for this brief: "${brief}".
        Identify competitors, market gaps, and 2-3 major technical/strategic risks.
        Format your response as a JSON-like structure (but in plain text) with:
        - Competitors (High threat)
        - Market Gap
        - Risks/Criticism
        - Strategy Fix
      `;
      
      const researchResult = await mickiiThink(researchPrompt);
      
      setCurrentBuild({
        id: Date.now().toString(),
        brief,
        research: researchResult.content,
        stage: 'research',
        timestamp: new Date().toISOString()
      });
      
      setIsProcessing(false);
      return true;
    } catch (err) {
      setError(err.message);
      setIsProcessing(false);
      return false;
    }
  }, []);

  const approveResearch = useCallback(async () => {
    if (!currentBuild) return;
    
    setIsProcessing(true);
    try {
      // 2. PHASE 2: BUILD
      const buildPrompt = `
        Based on the research: ${currentBuild.research}
        Build a high-quality React/HTML artifact for the project.
        Generate only the code block.
      `;
      
      const buildResult = await mickiiThink(buildPrompt);
      
      setCurrentBuild(prev => ({
        ...prev,
        artifact: buildResult.content,
        stage: 'products'
      }));
      
      setIsProcessing(false);
    } catch (err) {
      setError(err.message);
      setIsProcessing(false);
    }
  }, [currentBuild]);

  const generateMarketing = useCallback(async () => {
    if (!currentBuild || !currentBuild.artifact) return;
    
    setIsProcessing(true);
    try {
      // 3. PHASE 3: MARKETING
      const marketingPrompt = `
        Based on the Research: ${currentBuild.research}
        And the Built Product: ${currentBuild.artifact}
        Generate a list of 4 marketing assets (LinkedIn, Twitter, Email, ProductHunt).
        Each asset should have: platform, copy (engaging Hinglish), and a status 'Ready'.
        Format as a JSON array of objects.
      `;
      
      const marketingResult = await mickiiThink(marketingPrompt);
      
      // Attempt to parse JSON from Mickii's response
      let assets = [];
      try {
        const jsonMatch = marketingResult.content.match(/\[[\s\S]*\]/);
        if (jsonMatch) assets = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn("Mickii didn't return valid JSON for assets, using placeholder logic.");
      }

      setCurrentBuild(prev => ({
        ...prev,
        assets: assets.length ? assets : null,
        stage: 'marketing'
      }));
      
      setIsProcessing(false);
    } catch (err) {
      setError(err.message);
      setIsProcessing(false);
    }
  }, [currentBuild]);

  const value = {
    currentBuild,
    isProcessing,
    error,
    startNewBuild,
    approveResearch,
    generateMarketing
  };

  return <BuildContext.Provider value={value}>{children}</BuildContext.Provider>;
}

export const useBuild = () => useContext(BuildContext);
