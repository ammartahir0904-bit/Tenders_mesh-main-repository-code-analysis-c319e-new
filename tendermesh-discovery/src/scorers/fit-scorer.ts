import type { Tender } from '../types.js';
import { config } from '../config/env.js';

interface ScoreResult {
  overall: number;
  recommendation: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'SKIP';
  reasons: string[];
}

function getProfile() {
  return {
    categories: config.supplierCategories.map((c) => c.toLowerCase()),
    regions: config.supplierRegions.map((r) => r.toLowerCase()),
    valueMin: config.supplierValueMin,
    valueMax: config.supplierValueMax,
  };
}

export function scoreTender(tender: Tender): ScoreResult {
  const profile = getProfile();
  let score = 0;
  const reasons: string[] = [];

  const tenderCat = tender.category?.toLowerCase() || '';
  if (profile.categories.includes(tenderCat)) {
    score += 0.30;
    reasons.push(`✅ Category match: ${tender.category}`);
  } else {
    reasons.push(`❌ No category match (${tender.category})`);
  }

  const tenderLoc = tender.location?.toLowerCase() || '';
  if (profile.regions.some(r => tenderLoc.includes(r))) {
    score += 0.20;
    reasons.push(`✅ Location match: ${tender.location}`);
  } else if (!tender.location) {
    score += 0.10;
    reasons.push(`⚠️ Location not specified`);
  } else {
    reasons.push(`❌ No location match (${tender.location})`);
  }

  const val = tender.estimated_value || 0;
  if (val === 0) {
    score += 0.15;
    reasons.push(`⚠️ Value not published`);
  } else if (val >= profile.valueMin && val <= profile.valueMax) {
    score += 0.30;
    reasons.push(`✅ Value in range (${(val / 100).toLocaleString()} PKR)`);
  } else {
    reasons.push(`❌ Value out of range (${(val / 100).toLocaleString()} PKR)`);
  }

  if (tender.deadline) {
    const daysLeft = Math.floor((new Date(tender.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) {
      reasons.push(`❌ Deadline passed`);
    } else if (daysLeft >= 7) {
      score += 0.20;
      reasons.push(`✅ Good deadline (${daysLeft} days left)`);
    } else {
      score += 0.10;
      reasons.push(`⚠️ Tight deadline (${daysLeft} days left)`);
    }
  } else {
    score += 0.10;
    reasons.push(`⚠️ No deadline found`);
  }

  let recommendation: ScoreResult['recommendation'] = 'SKIP';
  if (score >= 0.80) recommendation = 'CRITICAL';
  else if (score >= 0.65) recommendation = 'HIGH';
  else if (score >= 0.50) recommendation = 'MEDIUM';

  return { overall: Math.round(score * 100) / 100, recommendation, reasons };
}