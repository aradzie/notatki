# Local Anki

In order for local Anki to be able to find and load the addon we have to make some preparations.
We need to make a symbolic link from the Anki addons directory to this addon directory.

```shell
ln -s -f -v $(pwd) ~/.local/share/Anki2/addons21
```

# Flatpak

It takes a bit of effort to set up the development environment for the addon. Below are the instruction on how to
configure Anki installed as a Flatpak package to load and run this addon.

First we need to make the addon directory available to the Flatpak sandbox.

```shell
# Show the existing Flatpak filesystem overrides for Anki.
flatpak override --user --show net.ankiweb.Anki

# Reset any existing Flatpak filesystem overrides for Anki.
flatpak override --user --reset net.ankiweb.Anki

# Make the current directory available to Anki running in the Flatpak sandbox.
flatpak override --user --filesystem=$(pwd):ro net.ankiweb.Anki
```

Then we need to make a symbolic link from the Anki addons directory to this addon directory.

```shell
ln -s -f -v $(pwd) ~/.var/app/net.ankiweb.Anki/data/Anki2/addons21
```
