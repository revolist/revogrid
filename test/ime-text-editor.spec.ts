import { ImeTextEditor } from '../src/components/editors/ime-text-editor';

it('does not start an edit from input events after the IME editor disconnects', async () => {
  const requestEdit = jest.fn(() => true);
  const editor = new ImeTextEditor({} as any, jest.fn(), requestEdit);
  const input = document.createElement('input');
  editor.editInput = input;
  await editor.componentDidRender();
  editor.disconnectedCallback();

  input.dispatchEvent(new Event('compositionstart'));
  input.dispatchEvent(new Event('input'));
  expect(requestEdit).not.toHaveBeenCalled();
});
