/**
 * Sentiment Routes
 */

const express = require('express');
const router = express.Router();
const queries = require('../../database/queries');
const logger = require('../../utils/logger');

/**
 * GET /api/sentiment?hours=24
 * Get sentiment summary and recent tweets
 */
router.get('/', async (req, res) => {
    try {
        const hours = Math.min(parseInt(req.query.hours) || 24, 168);

        const summary = await queries.getSentimentSummary(hours);
        const recentTweets = await queries.getRecentSentiment(hours);

        res.json({
            total_tweets: parseInt(summary.total_tweets) || 0,
            sentiment_breakdown: {
                positive: parseInt(summary.positive_count) || 0,
                neutral: parseInt(summary.neutral_count) || 0,
                negative: parseInt(summary.negative_count) || 0
            },
            avg_score: parseFloat(summary.avg_sentiment) || 0,
            total_engagement: {
                retweets: parseInt(summary.total_retweets) || 0,
                likes: parseInt(summary.total_likes) || 0
            },
            recent_tweets: recentTweets.slice(0, 10).map(tweet => ({
                text: tweet.tweet_text,
                sentiment: tweet.sentiment,
                score: parseFloat(tweet.sentiment_score),
                author: tweet.author_username,
                timestamp: tweet.tweet_created_at || tweet.collected_at
            })),
            period_hours: hours
        });
    } catch (error) {
        logger.error('Failed to get sentiment', { error: error.message });
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve sentiment data'
        });
    }
});

module.exports = router;
