sudo dnf update -y
sudo dnf install -y which git tar make openssl-devel libcurl-devel wget bzip2-devel xz-devel libffi-devel zlib-devel autoconf intltool 
sudo dnf install -y gcc gcc-c++ cmake
sudo dnf install -y docker
sudo dnf install -y python3.12
sudo dnf groupinstall -y "Development Tools"
sudo dnf install -y libtool automake


sudo ln -s /usr/bin/python3.12 /usr/bin/python
sudo dnf install -y python3.12-pip
sudo ln -s /usr/bin/pip3.12 /usr/bin/pip

wget https://releases.hashicorp.com/terraform/1.12.2/terraform_1.12.2_linux_amd64.zip
sudo unzip terraform_1.12.2_linux_amd64.zip -d /usr/bin/

wget -qO- https://get.pnpm.io/install.sh | ENV="$HOME/.bashrc" SHELL="$(which bash)" bash -
source /home/ec2-user/.bashrc

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source $HOME/.bashrc && nvm install 20

sudo dnf install -y java-17-amazon-corretto-headless

sudo groupadd docker
sudo usermod -aG docker $USER
newgrp docker
