import ffi from 'ffi-napi';
import ref from 'ref-napi';

/**
 * 先定义一个函数, 用来在窗口中显示字符
 * @param {String} text
 * @return {*} none
 */
function convertText(text: string) {
  return new Buffer(text + '\0', 'ucs2').toString(); //字符串必须以\0即null结尾!
}
// 通过ffi加载user32.dll
const myUser32 = new ffi.Library('user32', {
  // 声明这个dll中的一个函数
  MessageBoxW: [
    ref.types.int32,
    [ref.types.int32, ref.types.CString, ref.types.CString, ref.types.int32], // 用json的格式罗列其返回类型和参数类型
  ],
});

export function helloword() {
  // 调用user32.dll中的MessageBoxW()函数, 弹出一个对话框
  myUser32.MessageBoxW(0, convertText('I am Node.JS!'), convertText('Hello, World!'), 1);
}
