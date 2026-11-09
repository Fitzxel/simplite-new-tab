import test from 'node:test';
import assert from 'node:assert/strict';
import { createPixabayClient, daypartForHour } from '../src/pixabay-client.mjs';

test('maps local clock hours to the approved search bands', () => {
    assert.equal(daypartForHour(2), 'night');
    assert.equal(daypartForHour(7), 'morning');
    assert.equal(daypartForHour(10), 'day');
    assert.equal(daypartForHour(18), 'evening');
    assert.equal(daypartForHour(21), 'late-night');
    assert.equal(daypartForHour(23), 'night');
});

test('requests photo results from the configured proxy and stores one usable result', async () => {
    let requested;
    const client = createPixabayClient({
        proxyUrl: 'https://proxy.example.test/api/media',
        fetchImpl: async url => {
            requested = new URL(url);
            return Response.json({hits: [{id: 1, tags: 'mountains', largeImageURL: 'https://img.example.test/p.jpg', pageURL: 'https://pixabay.com/photos/1/'}]});
        },
        random: () => 0,
    });

    const result = await client.getMedia('photo', 'day', 'high');
    assert.equal(requested.searchParams.get('type'), 'photo');
    assert.equal(requested.searchParams.get('daypart'), 'day');
    assert.equal(result.dataURL, 'https://img.example.test/p.jpg');
    assert.equal(result.photographer_url, 'https://pixabay.com/photos/1/');
});

test('selects an available Pixabay video rendition and returns safe metadata', async () => {
    const client = createPixabayClient({
        proxyUrl: 'https://proxy.example.test/api/media',
        fetchImpl: async () => Response.json({hits: [{id: 2, tags: 'sunset', pageURL: 'https://pixabay.com/videos/2/', user: 'Creator', videos: {medium: {url: 'https://cdn.example.test/v.mp4', width: 1280, height: 720}}}]}),
        random: () => 0,
    });
    const result = await client.getMedia('video', 'evening', 'med');
    assert.equal(result.dataURL, 'https://cdn.example.test/v.mp4');
    assert.equal(result.photographer_name, 'Creator');
});
