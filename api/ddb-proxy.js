// Vercel Serverless Function — Proxy สำหรับ D&D Beyond Character API
// เรียกใช้: /api/ddb-proxy?id=XXXXXXXX

export default async function handler(req, res) {
    const { id } = req.query;

    if (!id || !/^\d+$/.test(id)) {
        return res.status(400).json({ error: 'Invalid character ID' });
    }

    try {
        const response = await fetch(
            `https://character-service.dndbeyond.com/character/v5/character/${id}`
        );

        if (!response.ok) {
            return res.status(response.status).json({ error: 'D&D Beyond API error' });
        }

        const data = await response.json();

        // Cache 5 นาที
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ error: 'Proxy fetch failed' });
    }
}
