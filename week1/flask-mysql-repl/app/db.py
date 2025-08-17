import mysql.connector

MASTER_CONFIG = {
    "host": "127.0.0.1",
    "port": 3307,
    "user": "root",
    "password": "root",
    "database": "usersdb"
}

REPLICA_CONFIG = {
    "host": "127.0.0.1",
    "port": 3308,
    "user": "root",
    "password": "root",
    "database": "usersdb"
}


def get_connection(read=False):
    try:
        if read:
            return mysql.connector.connect(**REPLICA_CONFIG)
    except:
        print("Replica down, falling back to master")
        return mysql.connector.connect(**MASTER_CONFIG)

    try:
        return mysql.connector.connect(**MASTER_CONFIG)
    except:
        if read:
            print("Promoting replica to master (failover)")
            return mysql.connector.connect(**REPLICA_CONFIG)
        raise
