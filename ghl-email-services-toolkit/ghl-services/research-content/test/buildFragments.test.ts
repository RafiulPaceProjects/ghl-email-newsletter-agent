import assert from 'node:assert/strict';
import {test} from 'node:test';

import {buildResearchContent} from '../src/buildFragments.js';

void test('normalizes sections into ordered content fragments', () => {
  const result = buildResearchContent({
    topic: 'Housing',
    sections: [
      {
        heading: 'Section One',
        bodyHtml: '<p>First</p>',
      },
      {
        slotId: 'secondary',
        heading: 'Section Two',
        bodyHtml: '<p>Second</p>',
      },
    ],
  });

  assert.equal(result.ok, true);
  assert.equal(result.fragmentCount, 2);
  assert.equal(result.contentFragments[0]?.slotId, 'section-1');
  assert.equal(result.contentFragments[1]?.slotId, 'secondary');
  assert.match(result.contentFragments[0]?.html ?? '', /Section One/);
});

void test('uses fragments directly when provided', () => {
  const result = buildResearchContent({
    topic: 'Transit',
    sourceLabel: 'daily-brief',
    fragments: [
      {
        slotId: 'hero',
        html: '<p>Hello</p>',
      },
    ],
  });

  assert.equal(result.contentFragments[0]?.slotId, 'hero');
  assert.equal(result.contentFragments[0]?.source.sourceLabel, 'daily-brief');
});

void test('requires sections or fragments', () => {
  assert.throws(
    () =>
      buildResearchContent({
        topic: 'Empty',
      }),
    /must include fragments\[\] or sections\[\]/,
  );
});
