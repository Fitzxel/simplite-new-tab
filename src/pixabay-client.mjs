export const DAYPART_TAGS = Object.freeze({
    night: 'night moon stars',
    morning: 'sunrise morning',
    day: 'nature landscape',
    evening: 'sunset',
    'late-night': 'city night',
});

export function daypartForHour(hour) {
    if (hour < 0 || hour > 23) throw new RangeError('hour must be between 0 and 23');
    if (hour >= 23 || hour < 7) return 'night';
    if (hour < 10) return 'morning';
    if (hour < 18) return 'day';
    if (hour < 21) return 'evening';
    return 'late-night';
}

export function createPixabayClient({proxyUrl, fetchImpl = fetch, random = Math.random}) {
    if (!proxyUrl) throw new TypeError('A Pixabay proxy URL is required');

    return {
        async getMedia(type, daypart, quality) {
            if (!['photo', 'video'].includes(type)) throw new TypeError('Unsupported media type');
            if (!Object.hasOwn(DAYPART_TAGS, daypart)) throw new TypeError('Unsupported daypart');
            const url = new URL(proxyUrl);
            url.searchParams.set('type', type);
            url.searchParams.set('daypart', daypart);
            const response = await fetchImpl(url.href);
            if (!response.ok) throw new Error(`Pixabay proxy returned ${response.status}`);
            const result = await response.json();
            const hits = Array.isArray(result.hits) ? result.hits : [];
            if (!hits.length) throw new Error(`No Pixabay ${type} results for ${daypart}`);

            const hit = hits[Math.min(hits.length - 1, Math.floor(random() * hits.length))];
            if (type === 'photo') {
                const image = quality === 'low' ? hit.webformatURL : hit.largeImageURL || hit.webformatURL;
                if (!image) throw new Error('Pixabay photo result has no usable image URL');
                return {dataURL: image, photographer_name: hit.user || '', photographer_url: hit.pageURL || '', qTime: daypart};
            }

            const renditions = hit.videos || {};
            const rendition = quality === 'low'
                ? renditions.small || renditions.tiny || renditions.medium
                : quality === 'high'
                    ? renditions.large || renditions.medium
                    : renditions.medium || renditions.large;
            if (!rendition?.url) throw new Error('Pixabay video result has no usable rendition');
            return {dataURL: rendition.url, photographer_name: hit.user || '', photographer_url: hit.pageURL || '', qTime: daypart};
        },
    };
}
