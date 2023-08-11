# Understanding The Design

React is not really a framework, it is more a UI library. It is focused on the challenge of composing dynamic user interfaces and doing so across the client and server boundary. A functional and declarative paradigm makes sense for React.

The primitives of React for managing state and side effects are scoped to individual components and you rely on mechanisms like props passing and context providers to share state and logic. This very quickly creates levels of indirection. In other words when developers looks at a component they can not CMD+Click some state or function to find its origin, it is often passed multiple times through props or the origin is a React context.

The first core principle of **Impact** is to allow developers to write object oriented code decoupled from React, but still naturally bridge it to the world of React. It does this by using reactive primitives that is consumed just as natural in the object oriented world as in the functional component world and binds the lifecycle of classes to the lifecycle of component trees. It also prevents multi level indirection as you will always consume an implementation of state and logic in your component, just a CMD+Click away.

The second core principle of **Impact** is to minimze indirection when navigating and debugging code. In other words you should ideally always be a single click away from finding executing code. In React applications you often find yourself:

- Searching for action types
- Figuring out the relationship between reducers and logic related to that reducer state
- Crawling up the component tree to find the logic related to a callback or owner of the state passed as a prop
- Getting cut off by a dispatcher reference or a context reference

## The bridge

Classes is at the core of object oriented programming and there are different ways you can expose an instantiated class to React. A feature of **Impact** is to bind the lifecycle of a class to the lifecycle of a component tree. In other words classes are created and disposed related to what components are consuming them.

To enable this mechanism **Impact** relies on [tsyringe](https://github.com/microsoft/tsyringe), a library from Microsoft, under the hood. Tsyringe is a general purpose dependency injector which enables the developer experience **Impact** is aiming for. There are other types of dependency injection, but TSyringe covers the following requirements:

- Nested injection containers with scoped class resolvement
- No type overrides (`!`) to express the validity of injection
- Injection of values
- Disposal of resolved classes when container is disposed

## Reactive primitives

**Impact** implements a reactive primitive called signals. This is a very simple reactive primitive which is designed to work just as well in an object oriented world, as in the functional and declarative world of React. That means the API for consuming the value of a signal needs to feel natural in both programming paradigms. Also changing the value should be allowed using mutation, though result in an "immutable" value for React to consume. On top of that promises also needs to be just as easily consumed by both worlds. All these considerations went into the design of the signals API.

"Change" is where things go wrong in your application. A user interacts with the application and you have unexpected state changes. The signal debugger gives you exact information about where a state change occurs in your code and also where state changes are being observed in your code. With VSCode you will be able to click debugging information in the browser and go straight to the code location inside VSCode. 
