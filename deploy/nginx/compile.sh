#!/bin/sh

cd /usr/local/src

# download source, plus naxsi, headers-more and pagespeed.
wget https://www.openssl.org/source/openssl-1.0.2g.tar.gz
wget http://nginx.org/download/nginx-1.9.12.tar.gz
wget https://github.com/nbs-system/naxsi/archive/master.tar.gz -O naxsi-master.tar.gz
wget https://github.com/openresty/headers-more-nginx-module/archive/v0.29rc1.tar.gz -O headers-more-0.29rc1.tar.gz

tar xvfz openssl-1.0.2g.tar.gz
tar xvfz nginx-1.9.12.tar.gz
tar xvfz headers-more-0.29rc1.tar.gz
tar xvfz naxsi-master.tar.gz

cd openssl-1.0.2g
./config --prefix=/usr --openssldir=/usr && make
checkinstall --install=no -y
apt-get purge -y openssl libssl-dev
dpkg -i openssl_1.0.2g-1_amd64.deb
## might need to reboot!
cd ..

# configure
cd nginx-1.9.12
./configure \
--add-module=../naxsi-master/naxsi_src \
--prefix=/usr/local \
--conf-path=/etc/nginx/nginx.conf  \
--pid-path=/var/run/nginx.pid \
--lock-path=/var/lock/nginx.lock \
--error-log-path=/var/log/nginx/error.log \
--http-log-path=/var/log/nginx/access.log \
--user=www-data \
--group=www-data \
--with-openssl=../openssl-1.0.2g \
--without-mail_pop3_module \
--without-mail_imap_module \
--without-mail_smtp_module \
--without-http_uwsgi_module \
--without-http_scgi_module \
--with-http_ssl_module \
--with-http_realip_module \
--with-http_sub_module \
--with-http_v2_module \
--with-http_flv_module \
--with-http_mp4_module \
--with-http_gunzip_module \
--with-http_gzip_static_module \
--with-http_random_index_module \
--with-http_secure_link_module \
--with-http_stub_status_module \
--with-http_auth_request_module \
--with-file-aio \
--with-debug \
--with-ipv6 \
--with-cc-opt='-g -O2 -fstack-protector --param=ssp-buffer-size=4 -Wformat -Werror=format-security -Wp,-D_FORTIFY_SOURCE=2' \
--with-ld-opt='-Wl,-z,relro -Wl,--as-needed' \
--add-module=../headers-more-nginx-module-0.29rc1

# compile
make

# install
checkinstall --install=no -y
dpkg -i nginx_1.9.12-1_amd64.deb
wget https://raw.githubusercontent.com/freezy/node-vpdb/master/deploy/init/nginx -O /etc/init.d/nginx
chmod 755 /etc/init.d/nginx
update-rc.d -f nginx defaults

# folders
mkdir -p /var/log/nginx /var/cache/nginx /var/cache/nginx-pagespeed
chown www-data:www-data /var/log/nginx /var/cache/nginx /var/cache/nginx-pagespeed
