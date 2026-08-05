import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

/**
 * A ~30-line stand-in for `@testing-library/react`'s `renderHook`.
 *
 * React 19 exports `act` from the `react` package itself and `createRoot` handles the
 * rest, so testing a hook needs a DOM and nothing more — pulling in testing-library and
 * its `@testing-library/dom` peer just to render a component that returns `null` would be
 * a poor trade for a first test suite. `createElement` rather than JSX keeps this a plain
 * `.ts` file, so the test setup needs no JSX transform configured anywhere.
 *
 * Requires the jsdom environment: add `// @vitest-environment jsdom` to any file that
 * imports this.
 */

// React refuses to run `act` outside a declared test environment.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

export interface HookHandle<T> {
  /** The value the hook returned on its most recent render. */
  readonly current: T;
  /** Re-render the probe — picks up changes made to whatever the hook reads. */
  rerender: () => void;
  unmount: () => void;
}

export function renderHook<T>(useHook: () => T): HookHandle<T> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  let latest: { value: T } | null = null;

  function Probe() {
    latest = { value: useHook() };
    return null;
  }

  const render = () => act(() => root.render(createElement(Probe)));

  render();

  return {
    get current(): T {
      if (!latest) throw new Error("Hook has not rendered yet.");
      return (latest as { value: T }).value;
    },
    rerender: render,
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}
