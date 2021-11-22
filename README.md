# safe
Simple cli tool to save your secret stuff.

## Usage
Install dependencies
```
$ npm install
```
Run
```
$ node index [options] <action> [name] [config]
```

## Link
Use `npm link` to create a symlink to run `safe` from anywhere

Now you can run
```
$ safe [options]
```
Use `npm unlink` to remove symlink

## Arguments
```
  action                   action you want to perform (choices: "add", "remove", "view", "config", "list", "path", "clear")
  name                     entry name
  config                   config arguments
```

## Options:
```
  -V, --version            output the version number
  -t, --type <type>         (choices: "text", "account", default: "text")
  -f, --file <filename>    used with add to insert a file
  -o, --output <filename>  output entry instead of console log
  -s, --safe <filename>    safe path
  --no-color               no color
  -h, --help               display help for command
```

## Initializing a safe
When you want to perform any action, If there was no safe file it will be created automatically.

## Using other than default safe
Use `-s, --safe <filename>` flag with any action.

Examples:

```
$ safe add entry -s path/to/file

$ safe clear --safe path/to/file
```

## Config
```sh
# Configure default safe path
$ safe config path path/to/file
#=> password: ********
#=> new default safe path: path/to/file

# View default safe path
$ safe path
#=> password: ********
#=> current path: path/to/file

# Configure default safe password
$ safe config password
#=> password: ********
#=> new password: password1
#=> password changed

# Configure password of other safe
$ safe config password -s path/to/file
#=> password: ********
#=> new password: password2
#=> password changed
```

## Add Entry
Save some text:
```sh
$ safe add <entry name>
#=> password: ********
#=> your text: example
#=> entry added successfully
```
Save an account:
```sh
$ safe add <entry name> -t account
#=> password: ********
#=> username/email: example@example.com
#=> password: *******
#=> entry added successfully
```
Save a file:
```sh
$ safe add <entry name> -f path/to/file
#=> password: ********
#=> entry added successfully
```

## View Entry
```sh
$ safe view <entry name>
#=> password: ********
#=> example
```
```sh
$ safe view <entry name>
#=> password: ********
#=> username/email: example@example.com
#=> password: example
```
If entry is a non-text file:
```sh
$ safe view <entry name>
#=> password: ********
#=> this entry is a file. would you like to export it ? (Y/N): y
#=> entry exported to file
```
Export entry to file:
```sh
$ safe view <entry name> -o entry.txt
#=> password: ********
#=> entry exported to entry.txt
```
`entry.txt` :
```
example
```

## Entry List
```sh
$ safe list
#=> password: ********
#=> entry list:
#=>   - text1
#=>   - account1
#=>   - filebin
```

## Remove Entry
```sh
$ safe remove <entry name>
#=> password: ********
#=> are you sure you want to remove "<entry name>" ? (Y/N): y
#=> entry removed successfully
```

## Clear Safe
```sh
$ safe clear
#=> password: ********
#=> are you sure you want to clear the safe ? (Y/N): y
#=> safe cleared successfully
```

## Disable Colors and Styling
This package uses [chalk](https://github.com/chalk/chalk) for terminal string styling. To disable it, simply use `--no-color` flag.