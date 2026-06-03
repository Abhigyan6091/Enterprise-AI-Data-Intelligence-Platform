import webbrowser
import hashlib


def geohash(lat, lon, datedow):
    h = hashlib.md5(datedow).hexdigest()
    p, q = [('%f' % float.fromhex('0.' + x)) for x in (h[:16], h[16:32])]
    print('%d%s %d%s' % (lat, p[1:], lon, q[1:]))


webbrowser.open("https://xkcd.com/353/")
