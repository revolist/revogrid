import { RevoEdit } from '../src/components/editors/revogr-edit';
import { TextEditor } from '../src/components/editors/text-editor';

function appendValue(component: RevoEdit, value: string) {
  const event = new CustomEvent<string>('internalappendeditvalue', {
    cancelable: true,
    detail: value,
  });
  component.onInternalAppendEditValue(event);
  return event;
}

describe('RevoEdit pending input', () => {
  it('appends input for TextEditor instances', () => {
    const component = new RevoEdit();
    const editor = new TextEditor({} as any);
    editor.editInput = document.createElement('input');
    editor.editInput.value = 'C';
    (component as any).currentEditor = editor;

    const event = appendValue(component, 'H');

    expect(event.defaultPrevented).toBe(true);
    expect(editor.editInput.value).toBe('CH');
  });

  it('appends input for TextEditor subclasses', () => {
    class CustomTextEditor extends TextEditor {}

    const component = new RevoEdit();
    const editor = new CustomTextEditor({} as any);
    editor.editInput = document.createElement('input');
    editor.editInput.value = 'C';
    (component as any).currentEditor = editor;

    const event = appendValue(component, 'H');

    expect(event.defaultPrevented).toBe(true);
    expect(editor.editInput.value).toBe('CH');
  });

  it('consumes input from constructor-independent editor capabilities', () => {
    const component = new RevoEdit();
    const appendPendingInput = jest.fn(() => true);
    (component as any).currentEditor = { appendPendingInput };

    const event = appendValue(component, 'H');

    expect(appendPendingInput).toHaveBeenCalledWith('H');
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not append input for custom editors without the capability', () => {
    const component = new RevoEdit();
    const input = document.createElement('input');
    input.value = 'C';
    (component as any).currentEditor = { editInput: input };

    const event = appendValue(component, 'H');

    expect(event.defaultPrevented).toBe(false);
    expect(input.value).toBe('C');
  });
});
