import React from 'react';
import { TopBar } from './TopBar';
import { TextEditor } from './TextEditor';

export function EditorPage() {
  return (
    <div className="h-screen flex flex-col">
      <TopBar />

      <div className="flex-1 flex overflow-hidden">
        <TextEditor />
      </div>
    </div>
  );
}
