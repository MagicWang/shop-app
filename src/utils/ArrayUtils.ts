export class ArrayUtils {
  public static distinct(arr: Array<any>) {
    return (arr || []).reduce((prev, item) => {
      if (prev.includes(item)) {
        prev.push(item);
      }
      return prev;
    }, []);
  }
}
