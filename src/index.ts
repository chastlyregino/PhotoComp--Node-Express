// File with intentional issues to test pre-commit hooks

const greeting = (name: string) => {
    // eslint-disable-next-line no-console
    console.log('Hello, ' + name + '!'); // Using console.log and double quotes
  
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const unused = 'This variable is never used';
  
    return 'Greeting completed'; // Missing semicolon
  };
  
  export default greeting;