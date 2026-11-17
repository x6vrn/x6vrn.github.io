import{r as e,t}from"./mount-BgbpRu1z.js";import{t as n}from"./Article-C1V5uNEi.js";var r={title:`The Art of XS-Leak Attacks`,subtitle:`Frame Counting`,minutes:7,toc:[{id:`frame-counting-leak`,title:`Frame counting leak`,level:`h2`},{id:`how-can-we-access-to-another-window`,title:`How can we access to another window ?`,level:`h3`},{id:`how-it-count`,title:`How it count ?`,level:`h3`},{id:`the-key-of-the-frame-counting`,title:`The key of the Frame counting`,level:`h2`},{id:`mitigations`,title:`Mitigations`,level:`h2`},{id:`visual-overview`,title:`Visual Overview`,level:`h2`}],body:[`
`,{tag:`p`,props:{},children:[`Hello, im here to explain the internals of XS-Leak attacks. i wont give you a high-level overview of the oracle with a payload and call it a day, im here to show you how the leaks work in chromium, line by line.`]},`
`,{tag:`p`,props:{},children:[`this all started because a friend asked me: "why is there no explanation of XS-Leak oracles in the chromium source code?" That question stuck in my head for days!. so i learned how chromium works (specific in blink), picked up C++, and took a deep dive into the source code to explain why and how the famous oracles in XS-Leaks actually work under the hood.`]},`
`,{tag:`blockquote`,props:{},children:[`
`,{tag:`p`,props:{},children:[`if you dont know what XS-Leaks are, here are some resources:`]},`
`,{tag:`p`,props:{},children:[{tag:`a`,props:{href:`https://xsleaks.dev/`},children:[`https://xsleaks.dev/`]}]},`
`,{tag:`p`,props:{},children:[{tag:`a`,props:{href:`https://book.jorianwoltjer.com/web/client-side/xs-leaks`},children:[`https://book.jorianwoltjer.com/web/client-side/xs-leaks`]}]},`
`]},`
`,{tag:`h2`,props:{id:`frame-counting-leak`},children:[`Frame counting leak`]},`
`,{tag:`p`,props:{},children:[`frame count leak is count how much is there frames in some page, we can count it even its in cross origin, also frames = (iframe, embed, object)
        for example:`]},`
`,{tag:`pre`,props:{tabIndex:0},children:[{tag:`code`,props:{className:`language-javascript`},children:[`w = window.open('https://example.com'); // example.com has 2 iframes
w.length // 2`]}],blockNumber:1},`
`,{tag:`p`,props:{},children:[`ok we know the frame count is count frames in cross origin, but how it works internally`]},`
`,{tag:`h3`,props:{id:`how-can-we-access-to-another-window`},children:[`How can we access to another window ?`]},`
`,{tag:`p`,props:{},children:[`when we do window.open(), the browser process decides where to run the new page. if its same-site, it stays in the same renderer process and creates a LocalWindowProxy. if its cross-site, site isolation puts in a separate renderer process and creates a RemoteWindowProxy in your process to represent the cross-origin window. this proxy only expose the properties that marked [CrossOrigin] in the IDL, everything else is blocked`]},`
`,{tag:`p`,props:{},children:[`i will deep dive in remote window proxy cuz this is our scope:`]},`
`,{tag:`p`,props:{},children:[`first we need to know what is the remote window proxy.`]},`
`,{tag:`p`,props:{},children:[`remote window proxy is the way to communicate with the another window, for example when we do:`]},`
`,{tag:`pre`,props:{tabIndex:0},children:[{tag:`code`,props:{className:`language-javascript`},children:[`w = window.open('https://example.com');`]}],blockNumber:2},`
`,{tag:`p`,props:{},children:[`we will open new window and we will set the key of the window `,{tag:`code`,props:{},children:[`w`]},`, ok what is the `,{tag:`code`,props:{},children:[`w`]},` and is it the really window?, its not `,{tag:`code`,props:{},children:[`w`]},` is the Window Proxy that will make us communicate with example.com window.`]},`
`,{tag:`blockquote`,props:{},children:[`
`,{tag:`p`,props:{},children:[`how is this possible?`]},`
`]},`
`,{tag:`p`,props:{},children:[`well in the `,{tag:`a`,props:{href:`https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/bindings/core/v8/remote_window_proxy.cc;l=107-134`,rel:`noopener noreferrer`,target:`_blank`},children:[{tag:`code`,props:{},children:[`third_party/blink/renderer/bindings/core/v8/remote_window_proxy.cc:107-134`]}]}]},`
`,{tag:`pre`,props:{tabIndex:0},children:[{tag:`code`,props:{className:`language-cpp`},children:[`void RemoteWindowProxy::CreateContext() {
  // Create a new v8::Context with the window object as the global object
  // (aka the inner global). Reuse the outer global proxy if it already exists.
  v8::Local<v8::ObjectTemplate> global_template =
      V8Window::GetWrapperTypeInfo()
          ->GetV8ClassTemplate(GetIsolate(), *world_)
          .As<v8::FunctionTemplate>()
          ->InstanceTemplate();
  CHECK(!global_template.IsEmpty());

  v8::Local<v8::Object> global_proxy =
      v8::Context::NewRemoteContext(GetIsolate(), global_template,
                                    global_proxy_.Get(GetIsolate()))
          .ToLocalChecked();
  if (global_proxy_.IsEmpty())
    global_proxy_.Reset(GetIsolate(), global_proxy);
  else
    DCHECK(global_proxy_ == global_proxy);
  CHECK(!global_proxy_.IsEmpty());

#if DCHECK_IS_ON()
  DidAttachGlobalObject();
#endif

  DCHECK(lifecycle_ == Lifecycle::kContextIsUninitialized ||
         lifecycle_ == Lifecycle::kGlobalObjectIsDetached);
  lifecycle_ = Lifecycle::kContextIsInitialized;
}`]}],blockNumber:3},`
`,{tag:`p`,props:{},children:[`in this part:`]},`
`,{tag:`pre`,props:{tabIndex:0},children:[{tag:`code`,props:{className:`language-cpp`},children:[`    v8::Local<v8::ObjectTemplate> global_template =
      V8Window::GetWrapperTypeInfo()
          ->GetV8ClassTemplate(GetIsolate(), *world_)
          .As<v8::FunctionTemplate>()
          ->InstanceTemplate();`]}],blockNumber:4},`
`,{tag:`p`,props:{},children:[`this builds the template that define what properties `,{tag:`code`,props:{},children:[`w`]},` has.
        `,{tag:`code`,props:{},children:[`V8Window::GetWrapperTypeInfo()`]},` comes from v8_window.cc (built from the idl) this template includes cross origin properties for the remote dom window, like length.`]},`
`,{tag:`pre`,props:{tabIndex:0},children:[{tag:`code`,props:{className:`language-cpp`},children:[`  v8::Local<v8::Object> global_proxy =
      v8::Context::NewRemoteContext(GetIsolate(), global_template,
                                    global_proxy_.Get(GetIsolate()))
          .ToLocalChecked();`]}],blockNumber:5},`
`,{tag:`p`,props:{},children:[`this line creates our `,{tag:`code`,props:{},children:[`w`]},`. NewRemoteContext is V8 API that creates proxy object using template above. this proxy lives in our process but represents a window in another process, it only has the properties defined in `,{tag:`code`,props:{},children:[`global_template`]}]},`
`,{tag:`p`,props:{},children:[`in the `,{tag:`a`,props:{href:`https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/bindings/core/v8/remote_window_proxy.cc;l=136-150`,rel:`noopener noreferrer`,target:`_blank`},children:[{tag:`code`,props:{},children:[`third_party/blink/renderer/bindings/core/v8/remote_window_proxy.cc:136-150`]}]}]},`
`,{tag:`pre`,props:{tabIndex:0},children:[{tag:`code`,props:{className:`language-cpp`},children:[`void RemoteWindowProxy::SetupWindowPrototypeChain() {
  // Associate the global proxy and its prototype chain with the
  // corresponding native DOMWindow object.
  DOMWindow* window = GetFrame()->DomWindow();
  const WrapperTypeInfo* wrapper_type_info = window->GetWrapperTypeInfo();

  // The global proxy object.  Note this is not the global object.
  v8::Local<v8::Object> global_proxy = global_proxy_.Get(GetIsolate());
  // Set a link from both JSGlobalProxy and its hidden prototype (remote
  // interceptor object) to the native DOMWindow object.
  V8DOMWrapper::SetNativeInfoForGlobal(GetIsolate(), global_proxy, window);
  CHECK(global_proxy == window->AssociateWithWrapper(GetIsolate(), world_,
                                                     wrapper_type_info,
                                                     global_proxy));
}`]}],blockNumber:6},`
`,{tag:`p`,props:{},children:[`in this part:`]},`
`,{tag:`pre`,props:{tabIndex:0},children:[{tag:`code`,props:{className:`language-cpp`},children:[`DOMWindow* window = GetFrame()->DomWindow();`]}],blockNumber:7},`
`,{tag:`p`,props:{},children:[`gets the Domwindow C++ object associated with this remote frame`]},`
`,{tag:`p`,props:{},children:[`in the `,{tag:`a`,props:{href:`https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/bindings/core/v8/remote_window_proxy.cc;l=143-146`,rel:`noopener noreferrer`,target:`_blank`},children:[{tag:`code`,props:{},children:[`third_party/blink/renderer/bindings/core/v8/remote_window_proxy.cc:143-146`]}]}]},`
`,{tag:`pre`,props:{tabIndex:0},children:[{tag:`code`,props:{className:`language-cpp`},children:[`  v8::Local<v8::Object> global_proxy = global_proxy_.Get(GetIsolate());
  // Set a link from both JSGlobalProxy and its hidden prototype (remote
  // interceptor object) to the native DOMWindow object.
  V8DOMWrapper::SetNativeInfoForGlobal(GetIsolate(), global_proxy, window);`]}],blockNumber:8},`
`,{tag:`p`,props:{},children:[`link the js proxy object (our `,{tag:`code`,props:{},children:[`w`]},`) to the C++ Domwindow object.`]},`
`,{tag:`p`,props:{},children:[`So when you call w.length, V8 hits the proxy -> finds the linked DomWindow -> calls DomWindow::length()`]},`
`,{tag:`pre`,props:{tabIndex:0},children:[{tag:`code`,props:{className:`language-cpp`},children:[`  CHECK(global_proxy == window->AssociateWithWrapper(GetIsolate(), world_,
                                                     wrapper_type_info,
                                                     global_proxy));`]}],blockNumber:9},`
`,{tag:`p`,props:{},children:[`finalizes the 2-way link, now DomWindow knows about the proxy and the proxy knows about DomWindow`]},`
`,{tag:`p`,props:{},children:[`so when you call w.length:`]},`
`,{tag:`pre`,props:{tabIndex:0},children:[{tag:`code`,props:{className:`language-javascript`},children:[`w                          -> global_proxy (created by NewRemoteContext)
  .length                  -> V8 checks global_template -> "length" is allowed
    -> finds linked DOMWindow via SetNativeInfoForGlobal
      -> calls DOMWindow::length()
        -> GetFrame()->Tree().ScopedChildCount()
          -> returns 3`]}],blockNumber:10},`
`,{tag:`h3`,props:{id:`how-it-count`},children:[`How it count ?`]},`
`,{tag:`p`,props:{},children:[`so we now know how window refernced and how it works, now ill explain how chromium counts the frames inside window`]},`
`,{tag:`p`,props:{},children:[`in `,{tag:`a`,props:{href:`https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/frame/dom_window.cc;l=310-314`,rel:`noopener noreferrer`,target:`_blank`},children:[{tag:`code`,props:{},children:[`third_party/blink/renderer/core/frame/dom_window.cc:310-314`]}]}]},`
`,{tag:`pre`,props:{tabIndex:0},children:[{tag:`code`,props:{className:`language-cpp`},children:[`unsigned DOMWindow::length() const {
  RecordWindowProxyAccessMetrics(
      mojom::blink::WindowProxyAccessType::kLength);
  return GetFrame() ? GetFrame()->Tree().ScopedChildCount() : 0;
}`]}],blockNumber:11},`
`,{tag:`p`,props:{},children:[`this is the .length function, in this line `,{tag:`code`,props:{},children:[`return GetFrame() ? GetFrame()->Tree().ScopedChildCount() : 0;`]},` the GetFrame() is function that checks if the frame is exist and not null, the comment below explain everything`]},`
`,{tag:`p`,props:{},children:[{tag:`a`,props:{href:`https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/frame/dom_window.h;l=62-76`,rel:`noopener noreferrer`,target:`_blank`},children:[{tag:`code`,props:{},children:[`third_party/blink/renderer/core/frame/dom_window.h:62-76`]}]}]},`
`,{tag:`pre`,props:{tabIndex:0},children:[{tag:`code`,props:{className:`language-cpp`},children:[`  Frame* GetFrame() const {
    // A Frame is typically reused for navigations. If |frame_| is not null,
    // two conditions must always be true:
    // - |frame_->domWindow()| must point back to this DOMWindow. If it does
    //   not, it is easy to introduce a bug where script execution uses the
    //   wrong DOMWindow (which may be cross-origin).
    // - |frame_| must be attached, i.e. |frame_->page()| must not be null.
    //   If |frame_->page()| is null, this indicates a bug where the frame was
    //   detached but |frame_| was not set to null. This bug can lead to
    //   issues where executing script incorrectly schedules work on a detached
    //   frame.
    SECURITY_DCHECK(!frame_ ||
                    (frame_->DomWindow() == this && frame_->GetPage()));
    return frame_.Get();
  }`]}],blockNumber:12},`
`,{tag:`p`,props:{},children:[`ok lets back to length() function, its check if the frame exist and if its exist it will get FrameTree by calling Tree(), Tree() function return parent/child relationships between frames`]},`
`,{tag:`p`,props:{},children:[`after that it will call ScopedChildCount() function:`]},`
`,{tag:`p`,props:{},children:[{tag:`a`,props:{href:`https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/page/frame_tree.cc;l=164-176`,rel:`noopener noreferrer`,target:`_blank`},children:[{tag:`code`,props:{},children:[`third_party/blink/renderer/core/page/frame_tree.cc:164-176`]}]}]},`
`,{tag:`pre`,props:{tabIndex:0},children:[{tag:`code`,props:{className:`language-cpp`},children:[`unsigned FrameTree::ScopedChildCount() const {
  if (scoped_child_count_ == kInvalidChildCount) {
    unsigned scoped_count = 0;
    for (Frame* child = FirstChild(); child;
         child = child->Tree().NextSibling()) {
      if (child->Client()->InShadowTree())
        continue;
      scoped_count++;
    }
    scoped_child_count_ = scoped_count;
  }
  return scoped_child_count_;
}`]}],blockNumber:13},`
`,{tag:`p`,props:{},children:[`this function the core of the count, first `,{tag:`code`,props:{},children:[`scoped_child_count_ == kInvalidChildCount`]},` it checks if the count didnt cached because:`]},`
`,{tag:`p`,props:{},children:[{tag:`a`,props:{href:`https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/page/frame_tree.cc;l=43`,rel:`noopener noreferrer`,target:`_blank`},children:[{tag:`code`,props:{},children:[`third_party/blink/renderer/core/page/frame_tree.cc:43`]}]}]},`
`,{tag:`pre`,props:{tabIndex:0},children:[{tag:`code`,props:{className:`language-cpp`},children:[`const unsigned kInvalidChildCount = ~0U;`]}],blockNumber:14},`
`,{tag:`p`,props:{},children:[`and`]},`
`,{tag:`p`,props:{},children:[{tag:`a`,props:{href:`https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/page/frame_tree.cc;l=47-48`,rel:`noopener noreferrer`,target:`_blank`},children:[{tag:`code`,props:{},children:[`third_party/blink/renderer/core/page/frame_tree.cc:47-48`]}]}]},`
`,{tag:`pre`,props:{tabIndex:0},children:[{tag:`code`,props:{className:`language-cpp`},children:[` FrameTree::FrameTree(Frame* this_frame)
    : this_frame_(this_frame), scoped_child_count_(kInvalidChildCount) {}`]}],blockNumber:15},`
`,{tag:`p`,props:{},children:[`they make a special number that checks if the frames cached or not`]},`
`,{tag:`p`,props:{},children:[`the special number is bitwise NOT of unsigned zero=4294967295 and they set the number in kInvalidChildCount and scoped_child_count_.`]},`
`,{tag:`p`,props:{},children:[`if the scoped_child_count_ and kInvalidChildCount = 4294967295 thats means they didnt counted yet so it will the for loop inside the if condition.`]},`
`,{tag:`pre`,props:{tabIndex:0},children:[{tag:`code`,props:{className:`language-cpp`},children:[`    for (Frame* child = FirstChild(); child;
         child = child->Tree().NextSibling()) {
      if (child->Client()->InShadowTree())
        continue;
      scoped_count++;
    }`]}],blockNumber:16},`
`,{tag:`p`,props:{},children:[`in the for loop it linked list traversal. start with the first child frame until child is null, and each iteration move to next sibling`]},`
`,{tag:`pre`,props:{tabIndex:0},children:[{tag:`code`,props:{className:`language-cpp`},children:[`if (child->Client()->InShadowTree())
    continue;`]}],blockNumber:17},`
`,{tag:`p`,props:{},children:[`if the frame lives inside Shadow dom skip it and dont count it.`]},`
`,{tag:`p`,props:{},children:[`ok now we know how the frames are count, but why they are can used even in cross origin ?.`]},`
`,{tag:`h2`,props:{id:`the-key-of-the-frame-counting`},children:[`The key of the Frame counting`]},`
`,{tag:`p`,props:{},children:[`first we need to know what is Web IDL`]},`
`,{tag:`blockquote`,props:{},children:[`
`,{tag:`p`,props:{},children:[`Web IDL, that can be used to describe interfaces that are intended to be implemented in web browsers. Web IDL is an IDL variant with a number of features that allow the behavior of common script objects in the web platform to be specified more readily. How interfaces described with Web IDL correspond to constructs within JavaScript execution environments`]},`
`]},`
`,{tag:`p`,props:{},children:[`if you need know more about Web IDL:`]},`
`,{tag:`p`,props:{},children:[{tag:`a`,props:{href:`https://www.chromium.org/developers/web-idl-interfaces/#web-idl`},children:[`https://www.chromium.org/developers/web-idl-interfaces/#web-idl`]}]},`
`,{tag:`p`,props:{},children:[{tag:`a`,props:{href:`https://webidl.spec.whatwg.org/`},children:[`https://webidl.spec.whatwg.org/`]}]},`
`,{tag:`p`,props:{},children:[`ok now we know what is Web IDL`]},`
`,{tag:`p`,props:{},children:[{tag:`a`,props:{href:`https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/frame/window.idl;l=62`,rel:`noopener noreferrer`,target:`_blank`},children:[{tag:`code`,props:{},children:[`third_party/blink/renderer/core/frame/window.idl:62`]}]}]},`
`,{tag:`pre`,props:{tabIndex:0},children:[{tag:`code`,props:{className:`language-cpp`},children:[`[Replaceable, CrossOrigin, Measure] readonly attribute unsigned long length;`]}],blockNumber:18},`
`,{tag:`p`,props:{},children:[`as we can see the length attribute inside window set as CrossOrigin`]},`
`,{tag:`p`,props:{},children:[`so we can access the .length for CrossOrigin site, and THIS IS THE KEY OF THE WHOLE LEAK!`]},`
`,{tag:`h2`,props:{id:`mitigations`},children:[`Mitigations`]},`
`,{tag:`p`,props:{},children:[`to mitigate this type of oracles, you can use`]},`
`,{tag:`ol`,props:{},children:[`
`,{tag:`li`,props:{},children:[`COOP (`,{tag:`code`,props:{},children:[`Cross-Origin-Opener-Policy: same-origin`]},`), severs the window.open() reference, the proxy becomes useless`]},`
`,{tag:`li`,props:{},children:[`use Shadow Dom, as i mentioned it before if the frame is in shadow dom the chromium wont count it`]},`
`]},`
`,{tag:`h2`,props:{id:`visual-overview`},children:[`Visual Overview`]},`
`,{tag:`p`,props:{},children:[`if you dont get it, i made a graph that explain everything`]},`
`,{tag:`figure`,props:{className:`diagram-figure`},children:[{tag:`a`,props:{href:`blog-assets/frame-counting.svg`,rel:`noopener noreferrer`,target:`_blank`},children:[{tag:`img`,props:{alt:`Frame counting flowchart. w.length passes through RemoteWindowProxy and a CrossOrigin IDL check to DOMWindow::length(). If a frame exists, FrameTree::ScopedChildCount() counts non-shadow child frames or returns the cached count.`,height:2908,loading:`lazy`,src:`blog-assets/frame-counting.svg`,width:1137},children:[]}]},{tag:`figcaption`,props:{},children:[`Open the diagram at full size.`]}]},`
`,{tag:`p`,props:{},children:[{tag:`strong`,props:{},children:[`See you in part 2 :)`]}]},`
`]},i=e();function a(){return(0,i.jsx)(n,{post:r})}t(a);